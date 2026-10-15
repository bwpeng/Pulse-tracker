/* Server-backed application state. The database is the source of truth: this
 * store holds a cached copy, applies optimistic updates for snappy logging, and
 * reconciles with whatever the API returns. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import { ApiError, api } from '../api/client.js';

const AppContext = createContext(null);

const initial = {
  status: 'loading', // loading | anonymous | ready | error
  error: null,
  user: null,
  goals: null,
  days: [],
  heartRate: [],
  devices: [],
  insights: [],
  overview: null,
  catalog: { foods: [], workouts: [] },
  today: null,
};

function replaceDay(days, updated) {
  if (!updated) return days;
  const next = days.map((d) => (d.date === updated.date ? updated : d));
  return next.some((d) => d.date === updated.date) ? next : [...next, updated].sort((a, b) => a.date.localeCompare(b.date));
}

function reducer(state, action) {
  switch (action.type) {
    case 'loading':
      return { ...state, status: 'loading', error: null };
    case 'anonymous':
      return { ...initial, status: 'anonymous' };
    case 'error':
      return { ...state, status: 'error', error: action.error };
    case 'ready':
      return { ...state, status: 'ready', error: null, ...action.payload };
    case 'patchDay':
      return { ...state, days: replaceDay(state.days, action.day) };
    case 'patchDayLocal':
      return {
        ...state,
        days: state.days.map((d) => (d.date === action.date ? { ...d, ...action.patch } : d)),
      };
    case 'goals':
      return { ...state, goals: action.goals };
    case 'preferences':
      return { ...state, user: { ...state.user, preferences: action.preferences } };
    case 'refreshed':
      return { ...state, insights: action.insights, overview: action.overview };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    dispatch({ type: 'loading' });
    try {
      const payload = await api.bootstrap();
      dispatch({ type: 'ready', payload });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) dispatch({ type: 'anonymous' });
      else dispatch({ type: 'error', error: err.message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Theme is a stored preference, so it follows the account across devices.
  const theme = state.user?.preferences?.theme ?? 'system';
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  /** Insights and the landing numbers are derived server-side; refresh them
   *  after a write so the whole app stays consistent with the database. */
  const refreshDerived = useCallback(async () => {
    try {
      const [insights, overview] = await Promise.all([api.insights(), api.overview()]);
      dispatch({ type: 'refreshed', insights, overview });
    } catch {
      /* non-critical — the primary write already succeeded */
    }
  }, []);

  const value = useMemo(() => {
    const days = state.days;
    const todayDate = state.today;
    const day = days.find((d) => d.date === todayDate) ?? days[days.length - 1] ?? null;

    const run = async (fn, successMessage) => {
      try {
        const result = await fn();
        if (successMessage) setToast(successMessage);
        refreshDerived();
        return result;
      } catch (err) {
        setToast(err.status === 0 ? 'Offline — the API is not reachable' : 'That did not save');
        load();
        throw err;
      }
    };

    return {
      ...state,
      days,
      day,
      recent: (n) => days.slice(-n),
      getDay: (date) => days.find((d) => d.date === date) ?? null,
      settings: state.user?.preferences ?? { units: 'metric', theme: 'system', showTables: false, reminders: true },
      units: state.user?.preferences?.units ?? 'metric',
      toast,
      notify: setToast,
      reload: load,

      async login(email, password) {
        const { user } = await api.login(email, password);
        await load();
        setToast(`Signed in as ${user.name.split(' ')[0]}`);
        return user;
      },

      async logout() {
        await api.logout();
        dispatch({ type: 'anonymous' });
      },

      addWater(ml) {
        // Optimistic: the ring moves before the round trip completes.
        if (day) {
          dispatch({
            type: 'patchDayLocal',
            date: day.date,
            patch: { waterMl: day.waterMl + ml },
          });
        }
        return run(async () => {
          const updated = await api.addWater(ml);
          dispatch({ type: 'patchDay', day: updated });
        }, `Logged ${ml} ml of water`);
      },

      addMeal(meal) {
        return run(async () => {
          const { day: updated } = await api.addMeal(meal);
          dispatch({ type: 'patchDay', day: updated });
        }, `Added ${meal.name}`);
      },

      removeMeal(id) {
        return run(async () => {
          const { day: updated } = await api.deleteMeal(id);
          dispatch({ type: 'patchDay', day: updated });
        }, 'Entry removed');
      },

      addWorkout(workout) {
        return run(async () => {
          const { day: updated } = await api.addWorkout(workout);
          dispatch({ type: 'patchDay', day: updated });
        }, `${workout.type} · ${workout.minutes} min logged`);
      },

      removeWorkout(id) {
        return run(async () => {
          const { day: updated } = await api.deleteWorkout(id);
          dispatch({ type: 'patchDay', day: updated });
        }, 'Workout removed');
      },

      resetDemo() {
        return run(async () => {
          await api.resetDemo();
          await load();
        }, 'Demo data reset');
      },

      setGoal(key, value) {
        dispatch({ type: 'goals', goals: { ...state.goals, [key]: value } });
        return run(async () => {
          const goals = await api.setGoals({ [key]: value });
          dispatch({ type: 'goals', goals });
        });
      },

      setPreference(key, value) {
        dispatch({
          type: 'preferences',
          preferences: { ...state.user.preferences, [key]: value },
        });
        return run(async () => {
          const preferences = await api.setPreferences({ [key]: value });
          dispatch({ type: 'preferences', preferences });
        });
      },
    };
  }, [state, toast, load, refreshDerived]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
