/* Single source of truth for the demo. State lives in memory and is mirrored
 * into localStorage so a reload keeps whatever you logged during the demo;
 * "Reset demo data" puts it back to the generated baseline. No server. */

import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { goals as baseGoals, history, profile } from '../data/mockData.js';
import { isoDay } from '../lib/format.js';

const STORAGE_KEY = 'pulse.demo.v1';

const AppContext = createContext(null);

const initialState = {
  settings: {
    theme: 'system', // 'system' | 'light' | 'dark'
    units: 'metric', // 'metric' | 'imperial'
    reminders: true,
    showTables: false,
  },
  goals: { ...baseGoals },
  /** User-logged additions, keyed by ISO date: { waterMl, meals[], workouts[] } */
  log: {},
};

function emptyEntry() {
  return { waterMl: 0, meals: [], workouts: [] };
}

function reducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.payload };

    case 'setSetting':
      return {
        ...state,
        settings: { ...state.settings, [action.key]: action.value },
      };

    case 'setGoal':
      return { ...state, goals: { ...state.goals, [action.key]: action.value } };

    case 'addWater': {
      const entry = state.log[action.date] ?? emptyEntry();
      return {
        ...state,
        log: {
          ...state.log,
          [action.date]: { ...entry, waterMl: Math.max(0, entry.waterMl + action.ml) },
        },
      };
    }

    case 'addMeal': {
      const entry = state.log[action.date] ?? emptyEntry();
      return {
        ...state,
        log: { ...state.log, [action.date]: { ...entry, meals: [...entry.meals, action.meal] } },
      };
    }

    case 'addWorkout': {
      const entry = state.log[action.date] ?? emptyEntry();
      return {
        ...state,
        log: {
          ...state.log,
          [action.date]: { ...entry, workouts: [...entry.workouts, action.workout] },
        },
      };
    }

    case 'removeMeal': {
      const entry = state.log[action.date] ?? emptyEntry();
      return {
        ...state,
        log: {
          ...state.log,
          [action.date]: { ...entry, meals: entry.meals.filter((m) => m.id !== action.id) },
        },
      };
    }

    case 'removeWorkout': {
      const entry = state.log[action.date] ?? emptyEntry();
      return {
        ...state,
        log: {
          ...state.log,
          [action.date]: {
            ...entry,
            workouts: entry.workouts.filter((w) => w.id !== action.id),
          },
        },
      };
    }

    case 'reset':
      return { ...initialState, settings: state.settings };

    default:
      return state;
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      settings: { ...initialState.settings, ...(parsed.settings ?? {}) },
      goals: { ...initialState.goals, ...(parsed.goals ?? {}) },
      log: parsed.log ?? {},
    };
  } catch {
    return null; // private mode / blocked storage — the demo still runs
  }
}

/** Merge generated history with anything logged in this session. */
function mergeDay(base, entry) {
  if (!entry) return base;
  const meals = [...base.meals, ...entry.meals];
  const workouts = [...base.workouts, ...entry.workouts];
  const addedMinutes = entry.workouts.reduce((sum, w) => sum + w.minutes, 0);
  const addedCalories = entry.workouts.reduce((sum, w) => sum + w.calories, 0);
  const addedKm = entry.workouts.reduce((sum, w) => sum + (w.distanceKm ?? 0), 0);
  return {
    ...base,
    meals,
    workouts,
    waterMl: base.waterMl + entry.waterMl,
    exerciseMinutes: base.exerciseMinutes + addedMinutes,
    activeCalories: base.activeCalories + addedCalories,
    distanceKm: Number((base.distanceKm + addedKm).toFixed(2)),
  };
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => load() ?? init);
  const [toast, setToast] = useState(null);
  const today = useMemo(() => isoDay(new Date()), []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — keep going, the demo is in-memory anyway */
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', state.settings.theme);
  }, [state.settings.theme]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const value = useMemo(() => {
    const days = history.map((day) => mergeDay(day, state.log[day.date]));
    const byDate = new Map(days.map((d) => [d.date, d]));
    return {
      state,
      dispatch,
      toast,
      notify: setToast,
      profile,
      today,
      days,
      day: byDate.get(today) ?? days[days.length - 1],
      getDay: (date) => byDate.get(date),
      /** Most recent `n` days, oldest first. */
      recent: (n) => days.slice(-n),
      settings: state.settings,
      goals: state.goals,
      units: state.settings.units,
    };
  }, [state, toast, today]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
