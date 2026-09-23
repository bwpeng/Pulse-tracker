import { useMemo, useState } from 'react';
import ActivityRings from '../components/ActivityRings.jsx';
import Card from '../components/Card.jsx';
import Meter from '../components/Meter.jsx';
import StatTile from '../components/StatTile.jsx';
import TopBar from '../components/TopBar.jsx';
import LogSheet from '../components/LogSheet.jsx';
import { useApp } from '../store/AppStore.jsx';
import { insights } from '../data/mockData.js';
import {
  clockFromMinutes,
  compact,
  distance,
  duration,
  longDate,
  num,
  volume,
  weight,
} from '../lib/format.js';

/* Colour note: the three rings are the only colour-coded *set* on this screen
 * (steps / energy / hydration — the three slots that validate all-pairs).
 * Tiles below carry their own single hue but are text-labelled individually,
 * so nothing here asks the reader to tell two hues apart to read a value. */

export default function Today() {
  const { day, days, goals, units, profile, dispatch, today, notify } = useApp();
  const [sheet, setSheet] = useState(null);

  const week = days.slice(-7);
  const yesterday = days[days.length - 2];

  const rings = [
    {
      label: 'Move',
      value: day.activeCalories,
      goal: goals.activeCalories,
      unit: 'kcal',
      color: 'var(--energy)',
      track: 'var(--energy-wash)',
      display: `${num(day.activeCalories)} / ${num(goals.activeCalories)} kcal`,
    },
    {
      label: 'Steps',
      value: day.steps,
      goal: goals.steps,
      unit: 'steps',
      color: 'var(--steps)',
      track: 'var(--steps-wash)',
      display: `${num(day.steps)} / ${compact(goals.steps)}`,
    },
    {
      label: 'Hydration',
      value: day.waterMl,
      goal: goals.waterMl,
      unit: 'ml',
      color: 'var(--hydration)',
      track: 'var(--hydration-wash)',
      display: `${volume(day.waterMl, units).value} / ${volume(goals.waterMl, units).value} ${
        volume(goals.waterMl, units).unit
      }`,
    },
  ];

  const hrTrend = useMemo(() => days.slice(-12).map((d) => d.restingHr), [days]);
  const sleepTrend = useMemo(() => days.slice(-12).map((d) => d.sleep.asleepMinutes), [days]);
  const weightTrend = useMemo(() => days.slice(-12).map((d) => d.weightKg), [days]);

  const hrDelta = day.restingHr - yesterday.restingHr;
  const dayWeight = weight(day.weightKg, units);
  const startWeight = weight(profile.startWeightKg, units);
  const weightChange = Number(dayWeight.value) - Number(startWeight.value);
  const dist = distance(day.distanceKm, units);
  const water = volume(day.waterMl, units);
  const waterGoal = volume(goals.waterMl, units);

  const mealTotal = day.meals.reduce((sum, m) => sum + m.calories, 0);

  return (
    <>
      <TopBar
        title="Today"
        subtitle={longDate(day.date)}
        onAdd={() => setSheet('water')}
      />

      <div className="view">
        <Card>
          <p className="card__sub">Steps so far</p>
          <p className="hero">
            {num(day.steps)}
            <span className="units">of {compact(goals.steps)}</span>
          </p>
          <p className="secondary" style={{ fontSize: 13, marginTop: 2 }}>
            {dist.value} {dist.unit} · {duration(day.exerciseMinutes)} of exercise ·{' '}
            {day.standHours} stand hours
          </p>

          <div className="rings" style={{ marginTop: 18 }}>
            <ActivityRings rings={rings} />
            <div className="rings__legend">
              {rings.map((ring) => (
                <div className="ringrow" key={ring.label}>
                  <span className="ringrow__key" style={{ background: ring.color }} />
                  <span>
                    {ring.label}
                    <span className="muted"> · {Math.round((ring.value / ring.goal) * 100)}%</span>
                  </span>
                  <span className="ringrow__val">{ring.display}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid grid--tiles">
          <StatTile
            label="Resting heart rate"
            value={day.restingHr}
            unit="bpm"
            color="var(--heart)"
            trend={hrTrend}
            delta={{
              direction: hrDelta === 0 ? 'flat' : hrDelta > 0 ? 'up' : 'down',
              good: hrDelta <= 0,
              label: `${Math.abs(hrDelta)} bpm vs yesterday`,
            }}
          />
          <StatTile
            label="Sleep last night"
            value={duration(day.sleep.asleepMinutes)}
            color="var(--seq-600)"
            trend={sleepTrend}
            hint={`${day.sleep.efficiency}% efficiency`}
          />
          <StatTile
            label="Exercise"
            value={day.exerciseMinutes}
            unit="min"
            color="var(--energy)"
            hint={`Goal ${goals.exerciseMinutes} min`}
          />
          <StatTile
            label="Weight"
            value={dayWeight.value}
            unit={dayWeight.unit}
            color="var(--text-muted)"
            trend={weightTrend}
            delta={{
              direction: weightChange > 0 ? 'up' : weightChange < 0 ? 'down' : 'flat',
              good: weightChange <= 0,
              label: `${Math.abs(weightChange).toFixed(1)} ${dayWeight.unit} in 90 days`,
            }}
          />
        </div>

        <div className="grid grid--cols">
          <Card
            title="Hydration"
            subtitle={`${water.value} ${water.unit} of ${waterGoal.value} ${waterGoal.unit}`}
            action={
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => setSheet('water')}
              >
                + Add
              </button>
            }
          >
            <Meter
              value={day.waterMl}
              max={goals.waterMl}
              color="var(--hydration)"
              label="Water intake against daily goal"
            />
            <p className="card__sub" style={{ marginTop: 10 }}>
              {day.waterMl >= goals.waterMl
                ? 'Goal met — nice.'
                : `${volume(goals.waterMl - day.waterMl, units).value} ${
                    volume(goals.waterMl - day.waterMl, units).unit
                  } to go.`}
            </p>
            <div className="chips" style={{ marginTop: 12 }}>
              {[250, 500, 750].map((ml) => (
                <button
                  key={ml}
                  type="button"
                  className="chip"
                  onClick={() => {
                    dispatch({ type: 'addWater', date: today, ml });
                    notify(
                      units === 'imperial'
                        ? `Logged ${Math.round(ml * 0.033814)} fl oz`
                        : `Logged ${ml} ml of water`
                    );
                  }}
                >
                  💧 +{units === 'imperial' ? `${Math.round(ml * 0.033814)} fl oz` : `${ml} ml`}
                </button>
              ))}
            </div>
          </Card>

          <Card
            title="Today's workouts"
            subtitle={
              day.workouts.length
                ? `${day.workouts.length} session${day.workouts.length > 1 ? 's' : ''}`
                : 'Nothing logged yet'
            }
            action={
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => setSheet('workout')}
              >
                + Log
              </button>
            }
          >
            {day.workouts.length ? (
              <div className="list">
                {day.workouts.map((w) => (
                  <div className="list__item" key={w.id}>
                    <span className="list__icon" aria-hidden="true">
                      {w.icon}
                    </span>
                    <div className="list__body">
                      <div className="list__title">{w.type}</div>
                      <div className="list__meta">
                        {clockFromMinutes(w.startMinutes)} · {duration(w.minutes)}
                        {w.distanceKm
                          ? ` · ${distance(w.distanceKm, units).value} ${
                              distance(w.distanceKm, units).unit
                            }`
                          : ''}
                      </div>
                    </div>
                    <span className="list__value">{num(w.calories)} kcal</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="card__sub">Log a session and it shows up here and in Activity.</p>
            )}
          </Card>
        </div>

        <Card
          title="Food diary"
          subtitle={`${num(mealTotal)} of ${num(goals.calories)} kcal`}
          action={
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => setSheet('food')}
            >
              + Add
            </button>
          }
        >
          <Meter
            value={mealTotal}
            max={goals.calories}
            color={
              mealTotal > goals.calories * 1.05
                ? 'var(--critical)'
                : mealTotal > goals.calories * 0.9
                  ? 'var(--warning)'
                  : 'var(--good)'
            }
            label="Calories eaten against daily budget"
          />
          <div className="list" style={{ marginTop: 10 }}>
            {day.meals.map((meal) => (
              <div className="list__item" key={meal.id}>
                <span className="list__icon" aria-hidden="true">
                  {meal.meal === 'Breakfast'
                    ? '🥣'
                    : meal.meal === 'Lunch'
                      ? '🥗'
                      : meal.meal === 'Dinner'
                        ? '🍽️'
                        : '🍎'}
                </span>
                <div className="list__body">
                  <div className="list__title">{meal.name}</div>
                  <div className="list__meta">
                    {meal.meal} · {clockFromMinutes(meal.loggedAtMinutes)}
                  </div>
                </div>
                <span className="list__value">{num(meal.calories)} kcal</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Insights" subtitle="Generated from the last 7 days of demo data">
          <div className="list">
            {insights.map((item) => (
              <div className="list__item" key={item.id} style={{ alignItems: 'flex-start' }}>
                <span className="list__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="list__body">
                  <div className="list__title" style={{ whiteSpace: 'normal' }}>
                    {item.title}
                  </div>
                  <p className="list__meta" style={{ whiteSpace: 'normal' }}>
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <p className="banner">
          <span aria-hidden="true">ℹ️</span>
          <span>
            Demo interface with synthetic data — {week.length} days generated on device. Nothing
            here is medical advice, and no data leaves this browser.
          </span>
        </p>
      </div>

      <LogSheet key={sheet} open={sheet != null} initialMode={sheet ?? 'water'} onClose={() => setSheet(null)} />
    </>
  );
}
