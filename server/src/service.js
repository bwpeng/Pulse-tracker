/* Everything the API reads or writes goes through here, so the partial-day
 * rule and the seed/user distinction are applied in exactly one place. */

import { db } from './db.js';
import { isoDay } from './lib/generate.js';

export const today = () => isoDay(new Date());

const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** Today is only as far along as the clock: seeded totals are scaled to the
 *  share of the day elapsed, and seeded entries timestamped later than now have
 *  not happened yet. Anything the user logged counts in full, immediately. */
const elapsedShare = () => Math.min(1, Math.max(0.12, nowMinutes() / 1440));

const num = (v, digits = 0) => Number(Number(v ?? 0).toFixed(digits));

export function getUser(userId) {
  const row = db
    .prepare(
      `SELECT id, email, name, initials, tagline, age, height_cm, start_weight_kg,
              target_weight_kg, units, theme, show_tables, reminders
         FROM users WHERE id = ?`
    )
    .get(userId);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    initials: row.initials,
    tagline: row.tagline,
    age: row.age,
    heightCm: row.height_cm,
    startWeightKg: row.start_weight_kg,
    targetWeightKg: row.target_weight_kg,
    preferences: {
      units: row.units,
      theme: row.theme,
      showTables: !!row.show_tables,
      reminders: !!row.reminders,
    },
  };
}

const PREF_COLUMNS = { units: 'units', theme: 'theme', showTables: 'show_tables', reminders: 'reminders' };
const UNITS = new Set(['metric', 'imperial']);
const THEMES = new Set(['system', 'light', 'dark']);

export function updatePreferences(userId, patch) {
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(PREF_COLUMNS)) {
    if (!(key in patch)) continue;
    let value = patch[key];
    if (key === 'units' && !UNITS.has(value)) continue;
    if (key === 'theme' && !THEMES.has(value)) continue;
    if (key === 'showTables' || key === 'reminders') value = value ? 1 : 0;
    sets.push(`${column} = ?`);
    values.push(value);
  }
  if (sets.length) {
    db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values, userId);
  }
  return getUser(userId).preferences;
}

const GOAL_COLUMNS = {
  steps: 'steps',
  activeCalories: 'active_calories',
  exerciseMinutes: 'exercise_minutes',
  waterMl: 'water_ml',
  sleepMinutes: 'sleep_minutes',
  calories: 'calories',
  protein: 'protein',
  carbs: 'carbs',
  fat: 'fat',
};

export function getGoals(userId) {
  const row = db.prepare('SELECT * FROM goals WHERE user_id = ?').get(userId);
  if (!row) return null;
  return Object.fromEntries(
    Object.entries(GOAL_COLUMNS).map(([key, column]) => [key, row[column]])
  );
}

export function updateGoals(userId, patch) {
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(GOAL_COLUMNS)) {
    if (!(key in patch)) continue;
    const value = Math.max(1, Math.round(Number(patch[key])));
    if (!Number.isFinite(value)) continue;
    sets.push(`${column} = ?`);
    values.push(value);
  }
  if (sets.length) {
    db.prepare(`UPDATE goals SET ${sets.join(', ')} WHERE user_id = ?`).run(...values, userId);
  }
  return getGoals(userId);
}

function mealRow(r) {
  return {
    id: r.id,
    date: r.date,
    meal: r.meal,
    name: r.name,
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    loggedAtMinutes: r.logged_at_minutes,
    userAdded: r.source === 'user',
  };
}

function workoutRow(r) {
  return {
    id: r.id,
    date: r.date,
    type: r.type,
    icon: r.icon,
    minutes: r.minutes,
    calories: r.calories,
    distanceKm: r.distance_km,
    avgHr: r.avg_hr,
    startMinutes: r.start_minutes,
    userAdded: r.source === 'user',
  };
}

/** Days in [from, to], oldest first, with today's partial-day rule applied. */
export function getDays(userId, { days = 7 } = {}) {
  const limit = Math.min(365, Math.max(1, Number(days) || 7));
  const base = db
    .prepare(`SELECT * FROM days WHERE user_id = ? ORDER BY date DESC LIMIT ?`)
    .all(userId, limit)
    .reverse();
  if (!base.length) return [];

  const from = base[0].date;
  const to = base[base.length - 1].date;
  const range = [userId, from, to];

  const sleepRows = db
    .prepare('SELECT * FROM sleep WHERE user_id = ? AND date BETWEEN ? AND ?')
    .all(...range);
  const waterRows = db
    .prepare(
      `SELECT date, source, SUM(ml) AS ml FROM water_logs
        WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY date, source`
    )
    .all(...range);
  const mealRows = db
    .prepare('SELECT * FROM meals WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY logged_at_minutes')
    .all(...range);
  const workoutRows = db
    .prepare('SELECT * FROM workouts WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY start_minutes')
    .all(...range);

  const sleepBy = new Map(sleepRows.map((r) => [r.date, r]));
  const mealsBy = new Map();
  for (const r of mealRows) {
    if (!mealsBy.has(r.date)) mealsBy.set(r.date, []);
    mealsBy.get(r.date).push(r);
  }
  const workoutsBy = new Map();
  for (const r of workoutRows) {
    if (!workoutsBy.has(r.date)) workoutsBy.set(r.date, []);
    workoutsBy.get(r.date).push(r);
  }
  const waterBy = new Map();
  for (const r of waterRows) {
    const entry = waterBy.get(r.date) ?? { seed: 0, user: 0 };
    entry[r.source === 'seed' ? 'seed' : 'user'] += r.ml;
    waterBy.set(r.date, entry);
  }

  const todayIso = today();
  const share = elapsedShare();
  const cutoff = nowMinutes();

  return base.map((row) => {
    const isToday = row.date === todayIso;
    const scale = isToday ? share : 1;

    const water = waterBy.get(row.date) ?? { seed: 0, user: 0 };
    const waterMl = Math.round(water.seed * scale) + water.user;

    const allMeals = (mealsBy.get(row.date) ?? []).filter(
      (m) => !isToday || m.source === 'user' || m.logged_at_minutes <= cutoff
    );
    const allWorkouts = (workoutsBy.get(row.date) ?? []).filter(
      (w) => !isToday || w.source === 'user' || w.start_minutes + w.minutes <= cutoff
    );

    const userWorkoutMinutes = allWorkouts
      .filter((w) => w.source === 'user')
      .reduce((sum, w) => sum + w.minutes, 0);
    const userWorkoutCalories = allWorkouts
      .filter((w) => w.source === 'user')
      .reduce((sum, w) => sum + w.calories, 0);
    const userWorkoutKm = allWorkouts
      .filter((w) => w.source === 'user')
      .reduce((sum, w) => sum + (w.distance_km ?? 0), 0);

    const nutrition = allMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const sleep = sleepBy.get(row.date);

    return {
      date: row.date,
      isToday,
      steps: Math.round(row.steps * scale),
      distanceKm: num(row.distance_km * scale + userWorkoutKm, 2),
      activeCalories: Math.round(row.active_calories * scale) + userWorkoutCalories,
      exerciseMinutes: Math.round(row.exercise_minutes * scale) + userWorkoutMinutes,
      standHours: isToday
        ? Math.max(0, Math.min(row.stand_hours, Math.round((cutoff - 420) / 60)))
        : row.stand_hours,
      restingHr: row.resting_hr,
      hrv: row.hrv,
      weightKg: row.weight_kg,
      waterMl,
      nutrition,
      sleep: sleep
        ? {
            asleepMinutes: sleep.asleep_minutes,
            deep: sleep.deep,
            rem: sleep.rem,
            light: sleep.light,
            awake: sleep.awake,
            bedtimeMinutes: sleep.bedtime_minutes,
            efficiency: Math.round(
              (sleep.asleep_minutes / (sleep.asleep_minutes + sleep.awake)) * 100
            ),
          }
        : null,
      meals: allMeals.map(mealRow),
      workouts: allWorkouts.map(workoutRow),
    };
  });
}

export function getDay(userId, date) {
  const row = db.prepare('SELECT date FROM days WHERE user_id = ? AND date = ?').get(userId, date);
  if (!row) return null;
  const all = getDays(userId, { days: 365 });
  return all.find((d) => d.date === date) ?? null;
}

export function addWater(userId, { date, ml }) {
  const amount = Math.round(Number(ml));
  if (!Number.isFinite(amount) || amount === 0) throw badRequest('ml must be a non-zero number');
  if (Math.abs(amount) > 5000) throw badRequest('ml out of range');
  const day = date ?? today();
  db.prepare('INSERT INTO water_logs (user_id, date, ml, source) VALUES (?, ?, ?, ?)').run(
    userId,
    day,
    amount,
    'user'
  );
  return getDay(userId, day);
}

const MEALS = new Set(['Breakfast', 'Lunch', 'Dinner', 'Snack']);

export function addMeal(userId, body) {
  const name = String(body.name ?? '').trim();
  if (!name) throw badRequest('name is required');
  const meal = MEALS.has(body.meal) ? body.meal : 'Snack';
  const date = body.date ?? today();
  const clamp = (v) => Math.max(0, Math.min(10000, Math.round(Number(v) || 0)));
  const info = db
    .prepare(
      `INSERT INTO meals (user_id, date, meal, name, calories, protein, carbs, fat,
                          logged_at_minutes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user')`
    )
    .run(
      userId,
      date,
      meal,
      name.slice(0, 120),
      clamp(body.calories),
      clamp(body.protein),
      clamp(body.carbs),
      clamp(body.fat),
      Number.isFinite(Number(body.loggedAtMinutes)) ? Number(body.loggedAtMinutes) : nowMinutes()
    );
  return { id: info.lastInsertRowid, day: getDay(userId, date) };
}

export function deleteMeal(userId, id) {
  const info = db
    .prepare(`DELETE FROM meals WHERE id = ? AND user_id = ? AND source = 'user'`)
    .run(id, userId);
  return info.changes > 0;
}

export function addWorkout(userId, body) {
  const type = String(body.type ?? '').trim() || 'Workout';
  const minutes = Math.max(1, Math.min(600, Math.round(Number(body.minutes) || 0)));
  const date = body.date ?? today();
  const info = db
    .prepare(
      `INSERT INTO workouts (user_id, date, type, icon, minutes, calories, distance_km,
                             avg_hr, start_minutes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user')`
    )
    .run(
      userId,
      date,
      type.slice(0, 40),
      String(body.icon ?? '🏃').slice(0, 8),
      minutes,
      Math.max(0, Math.min(5000, Math.round(Number(body.calories) || minutes * 7))),
      Math.max(0, Math.min(500, Number(body.distanceKm) || 0)),
      Math.max(40, Math.min(220, Math.round(Number(body.avgHr) || 132))),
      Number.isFinite(Number(body.startMinutes)) ? Number(body.startMinutes) : nowMinutes()
    );
  return { id: info.lastInsertRowid, day: getDay(userId, date) };
}

export function deleteWorkout(userId, id) {
  const info = db
    .prepare(`DELETE FROM workouts WHERE id = ? AND user_id = ? AND source = 'user'`)
    .run(id, userId);
  return info.changes > 0;
}

export function getHeartRateToday(userId) {
  const rows = db
    .prepare('SELECT minutes, bpm FROM hr_samples WHERE user_id = ? AND date = ? ORDER BY minutes')
    .all(userId, today());
  return rows;
}

export function getDevices(userId) {
  return db
    .prepare('SELECT id, name, detail, icon, linked FROM devices WHERE user_id = ?')
    .all(userId)
    .map((d) => ({ ...d, linked: !!d.linked }));
}

/** Quick-pick suggestions, drawn from what this account actually eats — scoped
 *  to the user so one demo account never surfaces another's entries. */
export function getFoodCatalog(userId) {
  return db
    .prepare(
      `SELECT name, meal, calories, protein, carbs, fat, COUNT(*) AS uses
         FROM meals WHERE user_id = ?
        GROUP BY name, meal ORDER BY uses DESC, name LIMIT 12`
    )
    .all(userId)
    .map(({ uses, ...item }) => item);
}

export function getWorkoutCatalog(userId) {
  return db
    .prepare(
      `SELECT type, icon, COUNT(*) AS uses FROM workouts WHERE user_id = ?
        GROUP BY type, icon ORDER BY uses DESC, type`
    )
    .all(userId)
    .map(({ type, icon }) => ({ type, icon }));
}

/** Insights are derived from the stored rows, not written by hand. */
export function getInsights(userId) {
  const days = getDays(userId, { days: 28 });
  const goals = getGoals(userId);
  const out = [];
  if (days.length < 8) return out;

  const week = days.slice(-7);
  const prior = days.slice(-14, -7);
  const avg = (rows, pick) => rows.reduce((s, r) => s + pick(r), 0) / (rows.length || 1);

  const bedtimeNow = avg(week, (d) => d.sleep?.bedtimeMinutes ?? 0);
  const bedtimeBefore = avg(prior, (d) => d.sleep?.bedtimeMinutes ?? 0);
  const drift = Math.round(bedtimeNow - bedtimeBefore);
  if (Math.abs(drift) >= 10) {
    out.push({
      id: 'bedtime',
      icon: '🌙',
      tone: drift > 0 ? 'warning' : 'good',
      title: `Bedtime moved ${Math.abs(drift)} minutes ${drift > 0 ? 'later' : 'earlier'} this week`,
      body:
        drift > 0
          ? 'Deep-sleep share usually falls with a later lights-out. A consistent bedtime is the lever with the most effect here.'
          : 'An earlier, steadier lights-out tends to show up as more deep sleep within a week or two.',
    });
  }

  const trainingDays = week.filter((d) => d.exerciseMinutes >= 40);
  if (trainingDays.length) {
    const onTraining = avg(trainingDays, (d) => d.waterMl);
    const gap = Math.round(((goals.waterMl - onTraining) / goals.waterMl) * 100);
    if (gap > 5) {
      out.push({
        id: 'hydration',
        icon: '💧',
        tone: 'warning',
        title: `Hydration runs ${gap}% under goal on training days`,
        body: `Across the ${trainingDays.length} day${trainingDays.length > 1 ? 's' : ''} you trained 40+ minutes, intake averaged ${Math.round(onTraining)} ml against a ${goals.waterMl} ml goal.`,
      });
    }
  }

  const hrNow = avg(days.slice(-7), (d) => d.restingHr);
  const hrBefore = avg(days.slice(0, 7), (d) => d.restingHr);
  const hrDelta = Math.round(hrNow - hrBefore);
  if (Math.abs(hrDelta) >= 2) {
    out.push({
      id: 'resting-hr',
      icon: '❤️',
      tone: hrDelta < 0 ? 'good' : 'warning',
      title: `Resting heart rate is ${Math.abs(hrDelta)} bpm ${hrDelta < 0 ? 'lower' : 'higher'} than four weeks ago`,
      body:
        hrDelta < 0
          ? 'A falling resting rate is typically a sign the aerobic base is improving.'
          : 'A rising resting rate often tracks poor sleep, illness or accumulated training load.',
    });
  }

  const goalDays = week.filter((d) => d.steps >= goals.steps).length;
  out.push({
    id: 'steps',
    icon: '👟',
    tone: goalDays >= 5 ? 'good' : 'neutral',
    title: `${goalDays} of the last 7 days hit the step goal`,
    body: `Daily average over the week is ${Math.round(avg(week, (d) => d.steps)).toLocaleString('en-US')} steps against a goal of ${goals.steps.toLocaleString('en-US')}.`,
  });

  return out;
}

/** Headline numbers for the landing page. */
export function getOverview(userId) {
  const days = getDays(userId, { days: 30 });
  const goals = getGoals(userId);
  const week = days.slice(-7);
  const totalSteps = days.reduce((s, d) => s + d.steps, 0);

  let streak = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].isToday && days[i].steps < goals.steps) continue; // today still in progress
    if (days[i].steps >= goals.steps) streak += 1;
    else break;
  }

  return {
    streak,
    daysTracked: days.length,
    totalSteps,
    weeklyAverageSteps: Math.round(week.reduce((s, d) => s + d.steps, 0) / (week.length || 1)),
    weeklyExerciseMinutes: week.reduce((s, d) => s + d.exerciseMinutes, 0),
    weeklySleepAverage: Math.round(
      week.reduce((s, d) => s + (d.sleep?.asleepMinutes ?? 0), 0) / (week.length || 1)
    ),
    today: days[days.length - 1] ?? null,
    goals,
  };
}

/** Clears everything this account logged by hand, leaving the seeded history
 *  intact — the "reset demo data" button. */
export function resetUserEntries(userId) {
  const run = db.transaction(() => {
    const meals = db.prepare(`DELETE FROM meals WHERE user_id = ? AND source = 'user'`).run(userId);
    const workouts = db
      .prepare(`DELETE FROM workouts WHERE user_id = ? AND source = 'user'`)
      .run(userId);
    const water = db
      .prepare(`DELETE FROM water_logs WHERE user_id = ? AND source = 'user'`)
      .run(userId);
    return meals.changes + workouts.changes + water.changes;
  });
  return { removed: run() };
}

export function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}
