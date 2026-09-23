/* Demo data. Everything here is synthetic and generated from a fixed seed so
 * the interface looks identical on every device and every reload. There is no
 * back end, no network call and no real person behind any of these numbers. */

import { addDays, isoDay } from '../lib/format.js';

/** mulberry32 — tiny deterministic PRNG. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DAYS = 90;

export const goals = {
  steps: 10000,
  activeCalories: 620,
  exerciseMinutes: 45,
  waterMl: 2500,
  sleepMinutes: 480,
  calories: 2200,
  protein: 130,
  carbs: 240,
  fat: 70,
};

export const profile = {
  name: 'Alex Rivera',
  initials: 'AR',
  age: 32,
  heightCm: 175,
  startWeightKg: 78.4,
  targetWeightKg: 73,
  connectedDevices: [
    { id: 'watch', name: 'Pulse Band 3', detail: 'Worn · synced 4 min ago', icon: '⌚️' },
    { id: 'phone', name: 'Phone motion sensor', detail: 'Background steps', icon: '📱' },
    { id: 'scale', name: 'Kitchen scale', detail: 'Paired over Bluetooth', icon: '⚖️' },
  ],
};

const WORKOUT_TYPES = [
  { type: 'Run', icon: '🏃', rate: 11.2, paceKmPerMin: 0.16 },
  { type: 'Cycling', icon: '🚲', rate: 8.6, paceKmPerMin: 0.38 },
  { type: 'Strength', icon: '🏋️', rate: 6.4, paceKmPerMin: 0 },
  { type: 'Yoga', icon: '🧘', rate: 3.8, paceKmPerMin: 0 },
  { type: 'Swim', icon: '🏊', rate: 9.4, paceKmPerMin: 0.05 },
  { type: 'Walk', icon: '🚶', rate: 4.6, paceKmPerMin: 0.09 },
];

const MEAL_LIBRARY = {
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

export const quickFoods = Object.entries(MEAL_LIBRARY).flatMap(([meal, items]) =>
  items.map((item) => ({ ...item, meal }))
);

export const quickWorkouts = WORKOUT_TYPES.map((w) => ({ type: w.type, icon: w.icon }));

function buildDay(iso, index, rand, weightKg) {
  const dow = new Date(`${iso}T12:00:00`).getDay();
  const weekend = dow === 0 || dow === 6;
  const trend = index / DAYS; // gentle improvement over the window

  const steps = Math.round(
    (weekend ? 7200 : 9600) + trend * 2200 + (rand() - 0.45) * 4200
  );
  const exerciseMinutes = Math.max(
    0,
    Math.round((weekend ? 28 : 42) + trend * 10 + (rand() - 0.5) * 34)
  );
  const activeCalories = Math.round(steps * 0.031 + exerciseMinutes * 6.1 + rand() * 60);

  const asleepMinutes = Math.round(
    (weekend ? 495 : 452) + trend * 12 + (rand() - 0.5) * 70
  );
  const deep = Math.round(asleepMinutes * (0.17 + rand() * 0.05));
  const rem = Math.round(asleepMinutes * (0.21 + rand() * 0.05));
  const awake = Math.round(8 + rand() * 22);
  const light = asleepMinutes - deep - rem;
  const bedtimeMinutes = Math.round(1350 + (weekend ? 45 : 0) + (rand() - 0.5) * 70);

  const workoutCount = exerciseMinutes > 30 ? (rand() > 0.72 ? 2 : 1) : rand() > 0.6 ? 1 : 0;
  const workouts = [];
  let minutesLeft = exerciseMinutes;
  for (let i = 0; i < workoutCount && minutesLeft > 8; i += 1) {
    const kind = WORKOUT_TYPES[Math.floor(rand() * WORKOUT_TYPES.length)];
    const minutes = i === workoutCount - 1 ? minutesLeft : Math.round(minutesLeft * 0.6);
    minutesLeft -= minutes;
    workouts.push({
      id: `${iso}-w${i}`,
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
  ['Breakfast', 'Lunch', 'Dinner', 'Snack'].forEach((slot, i) => {
    if (slot === 'Snack' && rand() > 0.72) return;
    const options = MEAL_LIBRARY[slot];
    const pick = options[Math.floor(rand() * options.length)];
    meals.push({
      id: `${iso}-m${i}`,
      meal: slot,
      ...pick,
      loggedAtMinutes: [8 * 60 + 15, 12 * 60 + 40, 19 * 60 + 5, 15 * 60 + 30][i],
    });
  });

  return {
    date: iso,
    steps,
    distanceKm: Number((steps * 0.000762).toFixed(2)),
    activeCalories,
    exerciseMinutes,
    standHours: Math.round(8 + rand() * 5),
    waterMl: Math.round(1500 + rand() * 1400),
    restingHr: Math.round(60 - trend * 4 + (rand() - 0.5) * 7),
    hrv: Math.round(48 + trend * 9 + (rand() - 0.5) * 16),
    weightKg: Number(weightKg.toFixed(1)),
    sleep: {
      asleepMinutes,
      deep,
      rem,
      light,
      awake,
      bedtimeMinutes,
      efficiency: Math.round((asleepMinutes / (asleepMinutes + awake)) * 100),
    },
    workouts,
    meals,
  };
}

/** Today is only as far along as the clock is: totals are scaled to the share
 *  of the day elapsed, and entries timestamped later than now haven't happened
 *  yet. Last night's sleep is left whole — it is already in the past. */
function partialDay(day, nowMinutes) {
  const elapsed = Math.min(1, Math.max(0.12, nowMinutes / 1440));
  const scale = (value) => Math.round(value * elapsed);
  return {
    ...day,
    steps: scale(day.steps),
    distanceKm: Number((day.distanceKm * elapsed).toFixed(2)),
    activeCalories: scale(day.activeCalories),
    exerciseMinutes: scale(day.exerciseMinutes),
    standHours: Math.max(0, Math.min(day.standHours, Math.round((nowMinutes - 420) / 60))),
    waterMl: scale(day.waterMl),
    meals: day.meals.filter((m) => m.loggedAtMinutes <= nowMinutes),
    workouts: day.workouts.filter((w) => w.startMinutes + w.minutes <= nowMinutes),
  };
}

function buildHistory() {
  const rand = rng(20260916);
  const today = isoDay(new Date());
  const days = [];
  let weightKg = profile.startWeightKg;
  for (let i = DAYS - 1; i >= 0; i -= 1) {
    const iso = addDays(today, -i);
    weightKg -= 0.035 + (rand() - 0.5) * 0.16;
    days.push(buildDay(iso, DAYS - 1 - i, rand, weightKg));
  }
  const now = new Date();
  days[days.length - 1] = partialDay(
    days[days.length - 1],
    now.getHours() * 60 + now.getMinutes()
  );
  return days;
}

/** 90 days of history, oldest first. The last entry is "today". */
export const history = buildHistory();

/** Intraday heart-rate samples for today, one point every 30 minutes. */
export const heartRateToday = (() => {
  const rand = rng(77);
  const points = [];
  for (let m = 0; m <= 1410; m += 30) {
    const hour = m / 60;
    const asleep = hour < 6.5;
    const base = asleep ? 54 : 68 + Math.sin((hour - 7) / 3) * 6;
    const spike = hour > 17.5 && hour < 19 ? 46 : 0;
    points.push({
      minutes: m,
      bpm: Math.round(base + spike + (rand() - 0.5) * 9),
    });
  }
  return points;
})();

export const insights = [
  {
    id: 'sleep-consistency',
    icon: '🌙',
    title: 'Bedtime drifted 42 minutes later this week',
    body: 'Your deep-sleep share fell with it. A consistent lights-out is the single lever with the most effect here.',
  },
  {
    id: 'hydration',
    icon: '💧',
    title: 'Hydration dips on workout days',
    body: 'On the four days you trained over 40 minutes, intake landed 18% under goal.',
  },
  {
    id: 'resting-hr',
    icon: '❤️',
    title: 'Resting heart rate trending down',
    body: 'Down 3 bpm over 90 days — typically a sign aerobic base is improving.',
  },
];
