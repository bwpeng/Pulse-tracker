/* Synthetic history generator. Runs once at seed time and writes real rows into
 * SQLite — after that the database is the source of truth, not this file. */

const DAY_MS = 86_400_000;

/** mulberry32 — deterministic PRNG, so a given seed always yields the same user. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isoDay(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function addDays(iso, delta) {
  return isoDay(new Date(`${iso}T12:00:00Z`).getTime() + delta * DAY_MS);
}

export const WORKOUT_TYPES = [
  { type: 'Run', icon: '🏃', rate: 11.2, paceKmPerMin: 0.16 },
  { type: 'Cycling', icon: '🚲', rate: 8.6, paceKmPerMin: 0.38 },
  { type: 'Strength', icon: '🏋️', rate: 6.4, paceKmPerMin: 0 },
  { type: 'Yoga', icon: '🧘', rate: 3.8, paceKmPerMin: 0 },
  { type: 'Swim', icon: '🏊', rate: 9.4, paceKmPerMin: 0.05 },
  { type: 'Walk', icon: '🚶', rate: 4.6, paceKmPerMin: 0.09 },
];

export const MEAL_LIBRARY = {
  Breakfast: [
    { name: 'Greek yogurt & berries', calories: 320, protein: 24, carbs: 38, fat: 8 },
    { name: 'Oatmeal, banana, almonds', calories: 410, protein: 13, carbs: 62, fat: 12 },
    { name: 'Two eggs on rye', calories: 365, protein: 21, carbs: 30, fat: 17 },
  ],
  Lunch: [
    { name: 'Chicken burrito bowl', calories: 640, protein: 45, carbs: 68, fat: 19 },
    { name: 'Lentil soup & sourdough', calories: 520, protein: 24, carbs: 74, fat: 11 },
    { name: 'Tuna salad wrap', calories: 480, protein: 34, carbs: 44, fat: 16 },
  ],
  Dinner: [
    { name: 'Salmon, rice, broccoli', calories: 680, protein: 46, carbs: 62, fat: 24 },
    { name: 'Tofu stir fry', calories: 560, protein: 30, carbs: 66, fat: 18 },
    { name: 'Turkey chilli', calories: 610, protein: 42, carbs: 54, fat: 21 },
  ],
  Snack: [
    { name: 'Apple & peanut butter', calories: 210, protein: 6, carbs: 26, fat: 10 },
    { name: 'Protein shake', calories: 180, protein: 28, carbs: 9, fat: 3 },
    { name: 'Dark chocolate square', calories: 120, protein: 2, carbs: 13, fat: 8 },
  ],
};

export const FOOD_CATALOG = Object.entries(MEAL_LIBRARY).flatMap(([meal, items]) =>
  items.map((item) => ({ ...item, meal }))
);

const MEAL_SLOT_MINUTES = { Breakfast: 495, Lunch: 760, Dinner: 1145, Snack: 930 };

/**
 * Build one person's history.
 * @param {object} options
 * @param {number} options.seed          deterministic per user
 * @param {number} options.days          how many days back to generate
 * @param {number} options.startWeightKg
 * @param {number} options.fitness       0..1 — shifts the whole profile up or down
 */
export function generateHistory({ seed, days = 90, startWeightKg = 78.4, fitness = 0.5 }) {
  const rand = rng(seed);
  const today = isoDay(new Date());
  const out = [];
  let weightKg = startWeightKg;

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    const index = days - 1 - i;
    const trend = index / days;
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const lift = 0.75 + fitness * 0.5;

    weightKg -= (0.035 + (rand() - 0.5) * 0.16) * (0.6 + fitness);

    const steps = Math.max(
      1200,
      Math.round(((weekend ? 7200 : 9600) + trend * 2200 + (rand() - 0.45) * 4200) * lift)
    );
    const exerciseMinutes = Math.max(
      0,
      Math.round(((weekend ? 28 : 42) + trend * 10 + (rand() - 0.5) * 34) * lift)
    );
    const activeCalories = Math.round(steps * 0.031 + exerciseMinutes * 6.1 + rand() * 60);

    const asleepMinutes = Math.round((weekend ? 495 : 452) + trend * 12 + (rand() - 0.5) * 70);
    const deep = Math.round(asleepMinutes * (0.17 + rand() * 0.05));
    const rem = Math.round(asleepMinutes * (0.21 + rand() * 0.05));
    const awake = Math.round(8 + rand() * 22);

    const workouts = [];
    const workoutCount = exerciseMinutes > 30 ? (rand() > 0.72 ? 2 : 1) : rand() > 0.6 ? 1 : 0;
    let minutesLeft = exerciseMinutes;
    for (let w = 0; w < workoutCount && minutesLeft > 8; w += 1) {
      const kind = WORKOUT_TYPES[Math.floor(rand() * WORKOUT_TYPES.length)];
      const minutes = w === workoutCount - 1 ? minutesLeft : Math.round(minutesLeft * 0.6);
      minutesLeft -= minutes;
      workouts.push({
        type: kind.type,
        icon: kind.icon,
        minutes,
        calories: Math.round(minutes * kind.rate),
        distanceKm: kind.paceKmPerMin ? Number((minutes * kind.paceKmPerMin).toFixed(2)) : 0,
        avgHr: Math.round(118 + rand() * 40),
        startMinutes: Math.round(400 + rand() * 600),
      });
    }

    const meals = [];
    for (const slot of ['Breakfast', 'Lunch', 'Dinner', 'Snack']) {
      if (slot === 'Snack' && rand() > 0.72) continue;
      const options = MEAL_LIBRARY[slot];
      const pick = options[Math.floor(rand() * options.length)];
      meals.push({ meal: slot, ...pick, loggedAtMinutes: MEAL_SLOT_MINUTES[slot] });
    }

    out.push({
      date,
      steps,
      distanceKm: Number((steps * 0.000762).toFixed(2)),
      activeCalories,
      exerciseMinutes,
      standHours: Math.round(8 + rand() * 5),
      restingHr: Math.round(60 - trend * 4 - fitness * 5 + (rand() - 0.5) * 7),
      hrv: Math.round(48 + trend * 9 + fitness * 8 + (rand() - 0.5) * 16),
      weightKg: Number(weightKg.toFixed(1)),
      waterMl: Math.round(1500 + rand() * 1400),
      sleep: {
        asleepMinutes,
        deep,
        rem,
        light: asleepMinutes - deep - rem,
        awake,
        bedtimeMinutes: Math.round(1350 + (weekend ? 45 : 0) + (rand() - 0.5) * 70),
      },
      workouts,
      meals,
    });
  }

  return out;
}

/** Intraday heart rate for one day, sampled every 30 minutes. */
export function generateHeartRate(seed) {
  const rand = rng(seed);
  const points = [];
  for (let m = 0; m <= 1410; m += 30) {
    const hour = m / 60;
    const asleep = hour < 6.5;
    const base = asleep ? 54 : 68 + Math.sin((hour - 7) / 3) * 6;
    const spike = hour > 17.5 && hour < 19 ? 46 : 0;
    points.push({ minutes: m, bpm: Math.round(base + spike + (rand() - 0.5) * 9) });
  }
  return points;
}
