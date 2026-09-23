import { useState } from 'react';
import Sheet from './Sheet.jsx';
import Segmented from './Segmented.jsx';
import { quickFoods, quickWorkouts } from '../data/mockData.js';
import { useApp } from '../store/AppStore.jsx';
import { ML_TO_FLOZ } from '../lib/format.js';

const MODES = [
  { value: 'water', label: 'Water' },
  { value: 'food', label: 'Food' },
  { value: 'workout', label: 'Workout' },
];

const WATER_STEPS = [
  { ml: 250, metric: '250 ml', imperial: '8 fl oz' },
  { ml: 500, metric: '500 ml', imperial: '17 fl oz' },
  { ml: 750, metric: '750 ml', imperial: '25 fl oz' },
];

export default function LogSheet({ open, onClose, initialMode = 'water' }) {
  const { dispatch, today, notify, units } = useApp();
  const [mode, setMode] = useState(initialMode);
  const [food, setFood] = useState({ name: '', meal: 'Breakfast', calories: '', protein: '', carbs: '', fat: '' });
  const [workout, setWorkout] = useState({ type: 'Run', minutes: '30', calories: '320' });

  const close = () => {
    setFood({ name: '', meal: 'Breakfast', calories: '', protein: '', carbs: '', fat: '' });
    onClose();
  };

  const logWater = (ml) => {
    dispatch({ type: 'addWater', date: today, ml });
    notify(
      units === 'imperial'
        ? `Logged ${Math.round(ml * ML_TO_FLOZ)} fl oz`
        : `Logged ${ml} ml of water`
    );
    close();
  };

  const logFood = (item) => {
    dispatch({
      type: 'addMeal',
      date: today,
      meal: {
        id: `user-${Date.now()}`,
        meal: item.meal,
        name: item.name,
        calories: Number(item.calories) || 0,
        protein: Number(item.protein) || 0,
        carbs: Number(item.carbs) || 0,
        fat: Number(item.fat) || 0,
        loggedAtMinutes: new Date().getHours() * 60 + new Date().getMinutes(),
        userAdded: true,
      },
    });
    notify(`Added ${item.name}`);
    close();
  };

  const logWorkout = () => {
    const minutes = Number(workout.minutes) || 0;
    if (!minutes) return;
    const picked = quickWorkouts.find((w) => w.type === workout.type);
    dispatch({
      type: 'addWorkout',
      date: today,
      workout: {
        id: `user-${Date.now()}`,
        type: workout.type,
        icon: picked?.icon ?? '🏃',
        minutes,
        calories: Number(workout.calories) || Math.round(minutes * 7),
        distanceKm: 0,
        avgHr: 132,
        startMinutes: new Date().getHours() * 60 + new Date().getMinutes(),
        userAdded: true,
      },
    });
    notify(`${workout.type} · ${minutes} min logged`);
    close();
  };

  return (
    <Sheet open={open} title="Log an entry" onClose={close}>
      <div style={{ marginBottom: 16 }}>
        <Segmented options={MODES} value={mode} onChange={setMode} label="What to log" />
      </div>

      {mode === 'water' && (
        <>
          <p className="card__sub" style={{ marginBottom: 10 }}>
            Tap an amount to add it to today.
          </p>
          <div className="chips" style={{ marginBottom: 14 }}>
            {WATER_STEPS.map((step) => (
              <button
                key={step.ml}
                type="button"
                className="chip"
                onClick={() => logWater(step.ml)}
              >
                💧 {units === 'imperial' ? step.imperial : step.metric}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--ghost btn--block" onClick={close}>
            Cancel
          </button>
        </>
      )}

      {mode === 'food' && (
        <>
          <p className="card__sub" style={{ marginBottom: 8 }}>Quick picks</p>
          <div className="chips" style={{ marginBottom: 16 }}>
            {quickFoods.slice(0, 6).map((item) => (
              <button
                key={item.name}
                type="button"
                className="chip"
                onClick={() => logFood(item)}
              >
                {item.name} · {item.calories} kcal
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!food.name.trim()) return;
              logFood(food);
            }}
          >
            <div className="field">
              <label className="field__label" htmlFor="food-name">
                Custom item
              </label>
              <input
                id="food-name"
                value={food.name}
                placeholder="e.g. Chicken and rice"
                onChange={(e) => setFood({ ...food, name: e.target.value })}
              />
            </div>
            <div className="grid grid--2">
              <div className="field">
                <label className="field__label" htmlFor="food-meal">
                  Meal
                </label>
                <select
                  id="food-meal"
                  value={food.meal}
                  onChange={(e) => setFood({ ...food, meal: e.target.value })}
                >
                  {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="food-cal">
                  Calories
                </label>
                <input
                  id="food-cal"
                  inputMode="numeric"
                  value={food.calories}
                  placeholder="0"
                  onChange={(e) => setFood({ ...food, calories: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid--2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              {['protein', 'carbs', 'fat'].map((key) => (
                <div className="field" key={key}>
                  <label className="field__label" htmlFor={`food-${key}`}>
                    {key[0].toUpperCase() + key.slice(1)} (g)
                  </label>
                  <input
                    id={`food-${key}`}
                    inputMode="numeric"
                    value={food[key]}
                    placeholder="0"
                    onChange={(e) => setFood({ ...food, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <button type="submit" className="btn btn--primary btn--block">
              Add to diary
            </button>
          </form>
        </>
      )}

      {mode === 'workout' && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            logWorkout();
          }}
        >
          <div className="field">
            <label className="field__label" htmlFor="w-type">
              Activity
            </label>
            <select
              id="w-type"
              value={workout.type}
              onChange={(e) => setWorkout({ ...workout, type: e.target.value })}
            >
              {quickWorkouts.map((w) => (
                <option key={w.type}>{w.type}</option>
              ))}
            </select>
          </div>
          <div className="grid grid--2">
            <div className="field">
              <label className="field__label" htmlFor="w-min">
                Minutes
              </label>
              <input
                id="w-min"
                inputMode="numeric"
                value={workout.minutes}
                onChange={(e) => setWorkout({ ...workout, minutes: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="w-cal">
                Calories
              </label>
              <input
                id="w-cal"
                inputMode="numeric"
                value={workout.calories}
                onChange={(e) => setWorkout({ ...workout, calories: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn btn--primary btn--block">
            Save workout
          </button>
        </form>
      )}
    </Sheet>
  );
}
