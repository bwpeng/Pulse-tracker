/* Fills the database with two fictional demo accounts and 90 days of history
 * each. Idempotent unless --force, which wipes and regenerates. */

import { db, isSeeded } from './db.js';
import { hashPassword } from './auth.js';
import { generateHistory, generateHeartRate, isoDay } from './lib/generate.js';

export const DEMO_PASSWORD = 'pulse1234';

const ACCOUNTS = [
  {
    email: 'alex@pulse.demo',
    name: 'Alex Rivera',
    initials: 'AR',
    tagline: 'Training for a first half marathon',
    age: 32,
    heightCm: 175,
    startWeightKg: 78.4,
    targetWeightKg: 73,
    seed: 20260916,
    fitness: 0.55,
    goals: {
      steps: 10000,
      activeCalories: 620,
      exerciseMinutes: 45,
      waterMl: 2500,
      sleepMinutes: 480,
      calories: 2200,
      protein: 130,
      carbs: 240,
      fat: 70,
    },
    devices: [
      { name: 'Pulse Band 3', detail: 'Worn · synced 4 min ago', icon: '⌚️' },
      { name: 'Phone motion sensor', detail: 'Background steps', icon: '📱' },
      { name: 'Kitchen scale', detail: 'Paired over Bluetooth', icon: '⚖️' },
    ],
  },
  {
    email: 'sam@pulse.demo',
    name: 'Sam Okafor',
    initials: 'SO',
    tagline: 'Getting back to three gym days a week',
    age: 41,
    heightCm: 182,
    startWeightKg: 91.2,
    targetWeightKg: 84,
    seed: 777123,
    fitness: 0.3,
    goals: {
      steps: 8000,
      activeCalories: 500,
      exerciseMinutes: 30,
      waterMl: 3000,
      sleepMinutes: 450,
      calories: 2500,
      protein: 150,
      carbs: 260,
      fat: 80,
    },
    devices: [
      { name: 'Pulse Band 2', detail: 'Worn · synced 12 min ago', icon: '⌚️' },
      { name: 'Treadmill (gym)', detail: 'Links on check-in', icon: '🏃' },
    ],
  },
];

const insertUser = db.prepare(`
  INSERT INTO users (email, name, initials, password_hash, age, height_cm,
                     start_weight_kg, target_weight_kg, tagline)
  VALUES (@email, @name, @initials, @passwordHash, @age, @heightCm,
          @startWeightKg, @targetWeightKg, @tagline)
`);

const insertGoals = db.prepare(`
  INSERT INTO goals (user_id, steps, active_calories, exercise_minutes, water_ml,
                     sleep_minutes, calories, protein, carbs, fat)
  VALUES (@userId, @steps, @activeCalories, @exerciseMinutes, @waterMl,
          @sleepMinutes, @calories, @protein, @carbs, @fat)
`);

const insertDay = db.prepare(`
  INSERT INTO days (user_id, date, steps, distance_km, active_calories,
                    exercise_minutes, stand_hours, resting_hr, hrv, weight_kg)
  VALUES (@userId, @date, @steps, @distanceKm, @activeCalories,
          @exerciseMinutes, @standHours, @restingHr, @hrv, @weightKg)
`);

const insertSleep = db.prepare(`
  INSERT INTO sleep (user_id, date, asleep_minutes, deep, rem, light, awake, bedtime_minutes)
  VALUES (@userId, @date, @asleepMinutes, @deep, @rem, @light, @awake, @bedtimeMinutes)
`);

const insertWater = db.prepare(
  `INSERT INTO water_logs (user_id, date, ml, source) VALUES (?, ?, ?, 'seed')`
);

const insertMeal = db.prepare(`
  INSERT INTO meals (user_id, date, meal, name, calories, protein, carbs, fat,
                     logged_at_minutes, source)
  VALUES (@userId, @date, @meal, @name, @calories, @protein, @carbs, @fat,
          @loggedAtMinutes, 'seed')
`);

const insertWorkout = db.prepare(`
  INSERT INTO workouts (user_id, date, type, icon, minutes, calories, distance_km,
                        avg_hr, start_minutes, source)
  VALUES (@userId, @date, @type, @icon, @minutes, @calories, @distanceKm,
          @avgHr, @startMinutes, 'seed')
`);

const insertHr = db.prepare(
  'INSERT INTO hr_samples (user_id, date, minutes, bpm) VALUES (?, ?, ?, ?)'
);

const insertDevice = db.prepare(
  'INSERT INTO devices (user_id, name, detail, icon) VALUES (?, ?, ?, ?)'
);

function seedAccount(account) {
  const userId = insertUser.run({
    ...account,
    passwordHash: hashPassword(DEMO_PASSWORD),
  }).lastInsertRowid;

  insertGoals.run({ userId, ...account.goals });
  for (const d of account.devices) insertDevice.run(userId, d.name, d.detail, d.icon);

  const history = generateHistory({
    seed: account.seed,
    days: 90,
    startWeightKg: account.startWeightKg,
    fitness: account.fitness,
  });

  for (const day of history) {
    insertDay.run({ userId, ...day });
    insertSleep.run({ userId, date: day.date, ...day.sleep });
    insertWater.run(userId, day.date, day.waterMl);
    for (const meal of day.meals) insertMeal.run({ userId, date: day.date, ...meal });
    for (const w of day.workouts) insertWorkout.run({ userId, date: day.date, ...w });
  }

  const today = isoDay(new Date());
  for (const point of generateHeartRate(account.seed)) {
    insertHr.run(userId, today, point.minutes, point.bpm);
  }

  return userId;
}

export function seed({ force = false } = {}) {
  if (isSeeded() && !force) return { seeded: false, reason: 'already_seeded' };

  const run = db.transaction(() => {
    if (force) {
      for (const table of [
        'hr_samples', 'workouts', 'meals', 'water_logs', 'sleep', 'days',
        'devices', 'goals', 'users',
      ]) {
        db.prepare(`DELETE FROM ${table}`).run();
      }
    }
    return ACCOUNTS.map(seedAccount);
  });

  const ids = run();
  return { seeded: true, users: ids.length };
}

/** Shown on the sign-in screen so the demo accounts are discoverable. The
 *  password is deliberately NOT included — it lives in the README only. */
export const demoAccounts = ACCOUNTS.map(({ email, name, initials, tagline }) => ({
  email,
  name,
  initials,
  tagline,
}));

if (process.argv[1]?.endsWith('seed.js')) {
  const result = seed({ force: process.argv.includes('--force') });
  console.log(JSON.stringify(result));
}
