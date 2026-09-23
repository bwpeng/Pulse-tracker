import { useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import ChartCard from '../components/ChartCard.jsx';
import Meter from '../components/Meter.jsx';
import StackedBarChart from '../components/StackedBarChart.jsx';
import TopBar from '../components/TopBar.jsx';
import LogSheet from '../components/LogSheet.jsx';
import { useApp } from '../store/AppStore.jsx';
import { clockFromMinutes, num, shortDate, weekday } from '../lib/format.js';

/* Macro identity uses categorical slots 1-3 (the all-pairs validated set).
 * The calorie budget is a *meter*, so it takes the reserved status palette
 * instead — a status colour never stands in for a series. */
const MACROS = [
  { key: 'protein', label: 'Protein', color: 'var(--steps)', goalKey: 'protein' },
  { key: 'carbs', label: 'Carbs', color: 'var(--energy)', goalKey: 'carbs' },
  { key: 'fat', label: 'Fat', color: 'var(--hydration)', goalKey: 'fat' },
];

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MEAL_ICON = { Breakfast: '🥣', Lunch: '🥗', Dinner: '🍽️', Snack: '🍎' };

function sumMacros(meals) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export default function Nutrition() {
  const { day, days, goals, dispatch, today, notify } = useApp();
  const [open, setOpen] = useState(false);

  const totals = useMemo(() => sumMacros(day.meals), [day.meals]);
  const remaining = goals.calories - totals.calories;
  const share = totals.calories / goals.calories;
  const budgetColor =
    share > 1.05 ? 'var(--critical)' : share > 0.9 ? 'var(--warning)' : 'var(--good)';
  const budgetState = share > 1.05 ? 'Over budget' : share > 0.9 ? 'Close to budget' : 'On track';

  const week = useMemo(
    () =>
      days.slice(-7).map((d) => {
        const m = sumMacros(d.meals);
        return {
          label: weekday(d.date),
          full: shortDate(d.date),
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          calories: m.calories,
        };
      }),
    [days]
  );

  const byMeal = MEAL_ORDER.map((name) => ({
    name,
    items: day.meals.filter((m) => m.meal === name),
  })).filter((group) => group.items.length);

  return (
    <>
      <TopBar title="Food" subtitle={`${num(totals.calories)} kcal logged today`} onAdd={() => setOpen(true)} />

      <div className="view">
        <Card>
          <p className="card__sub">{remaining >= 0 ? 'Calories remaining' : 'Calories over'}</p>
          <p className="hero">
            {num(Math.abs(remaining))}
            <span className="units">of {num(goals.calories)} kcal</span>
          </p>
          <div style={{ marginTop: 14 }}>
            <Meter
              value={totals.calories}
              max={goals.calories}
              color={budgetColor}
              label="Calories eaten against daily budget"
            />
          </div>
          <div className="row row--between" style={{ marginTop: 8, fontSize: 12.5 }}>
            <span className="secondary">
              <span aria-hidden="true">{share > 1.05 ? '⚠️' : share > 0.9 ? '⏳' : '✅'}</span>{' '}
              {budgetState}
            </span>
            <span className="muted">{num(totals.calories)} eaten</span>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 16 }}>
            {MACROS.map((macro) => {
              const value = totals[macro.key];
              const goal = goals[macro.goalKey];
              return (
                <div key={macro.key}>
                  <div className="row row--between" style={{ fontSize: 12.5, marginBottom: 6 }}>
                    <span className="secondary">
                      <span
                        className="tile__dot"
                        style={{ background: macro.color, display: 'inline-block', marginRight: 6 }}
                      />
                      {macro.label}
                    </span>
                  </div>
                  <Meter
                    value={value}
                    max={goal}
                    color={macro.color}
                    label={`${macro.label} against goal`}
                  />
                  <p style={{ fontSize: 12.5, marginTop: 6 }} className="secondary">
                    <strong style={{ color: 'var(--text-primary)' }}>{num(value)}g</strong> / {goal}g
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <ChartCard
          title="Macros this week"
          subtitle="Grams per day, stacked"
          legend={MACROS.map((m) => ({ label: m.label, color: m.color }))}
          table={{
            columns: ['Day', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'kcal'],
            rows: week
              .slice()
              .reverse()
              .map((d) => [d.full, d.protein, d.carbs, d.fat, num(d.calories)]),
          }}
        >
          <StackedBarChart
            data={week}
            series={MACROS.map(({ key, label, color }) => ({ key, label, color }))}
            unit="g"
            format={(v) => num(v)}
          />
        </ChartCard>

        <Card
          title="Today's diary"
          subtitle={`${day.meals.length} entries`}
          action={
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => setOpen(true)}>
              + Add food
            </button>
          }
        >
          {byMeal.map((group) => {
            const groupTotals = sumMacros(group.items);
            return (
              <div key={group.name} style={{ marginBottom: 14 }}>
                <div className="row row--between" style={{ marginBottom: 2 }}>
                  <h3 className="card__title" style={{ fontSize: 13.5 }}>
                    {MEAL_ICON[group.name]} {group.name}
                  </h3>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {num(groupTotals.calories)} kcal
                  </span>
                </div>
                <div className="list">
                  {group.items.map((item) => (
                    <div className="list__item" key={item.id}>
                      <div className="list__body">
                        <div className="list__title">{item.name}</div>
                        <div className="list__meta">
                          {clockFromMinutes(item.loggedAtMinutes)} · {item.protein}P ·{' '}
                          {item.carbs}C · {item.fat}F
                        </div>
                      </div>
                      <span className="list__value">{num(item.calories)} kcal</span>
                      {item.userAdded && (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => {
                            dispatch({ type: 'removeMeal', date: today, id: item.id });
                            notify('Entry removed');
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <button type="button" className="btn btn--primary btn--block" onClick={() => setOpen(true)}>
            Log food
          </button>
        </Card>
      </div>

      <LogSheet key={open} open={open} initialMode="food" onClose={() => setOpen(false)} />
    </>
  );
}
