import { useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import ChartCard from '../components/ChartCard.jsx';
import ColumnChart from '../components/ColumnChart.jsx';
import LineChart from '../components/LineChart.jsx';
import Segmented from '../components/Segmented.jsx';
import StatTile from '../components/StatTile.jsx';
import TopBar from '../components/TopBar.jsx';
import LogSheet from '../components/LogSheet.jsx';
import { useApp } from '../store/AppStore.jsx';
import {
  clockFromMinutes,
  compact,
  distance,
  duration,
  num,
  shortDate,
  weekday,
} from '../lib/format.js';

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

export default function Activity() {
  const { days, goals, units, heartRate } = useApp();
  const [range, setRange] = useState(7);
  const [sheet, setSheet] = useState(null);

  const window = useMemo(() => days.slice(-range), [days, range]);

  const stepSeries = useMemo(
    () =>
      window.map((d) => ({
        label: range === 7 ? weekday(d.date) : shortDate(d.date),
        full: shortDate(d.date),
        value: d.steps,
      })),
    [window, range]
  );

  const hrSeries = useMemo(
    () =>
      window.map((d) => ({
        label: range === 7 ? weekday(d.date) : shortDate(d.date),
        full: shortDate(d.date),
        value: d.restingHr,
      })),
    [window, range]
  );

  const intraday = useMemo(
    () =>
      heartRate.map((p) => ({
        label: clockFromMinutes(p.minutes).replace(':00', ''),
        full: clockFromMinutes(p.minutes),
        value: p.bpm,
      })),
    [heartRate]
  );

  const totals = window.reduce(
    (acc, d) => ({
      steps: acc.steps + d.steps,
      km: acc.km + d.distanceKm,
      kcal: acc.kcal + d.activeCalories,
      minutes: acc.minutes + d.exerciseMinutes,
      goalDays: acc.goalDays + (d.steps >= goals.steps ? 1 : 0),
    }),
    { steps: 0, km: 0, kcal: 0, minutes: 0, goalDays: 0 }
  );

  const avgSteps = Math.round(totals.steps / window.length);
  // Only compare against a previous window when one actually exists — the demo
  // history is 90 days, so the 90-day range has nothing behind it.
  const prevWindow = days.slice(-range * 2, -range);
  const stepsDelta = prevWindow.length
    ? avgSteps - Math.round(prevWindow.reduce((s, d) => s + d.steps, 0) / prevWindow.length)
    : null;
  const dist = distance(totals.km, units);

  const recentWorkouts = useMemo(
    () =>
      window
        .slice()
        .reverse()
        .flatMap((d) => d.workouts.map((w) => ({ ...w, date: d.date })))
        .slice(0, 8),
    [window]
  );

  return (
    <>
      <TopBar
        title="Activity"
        subtitle={`Last ${range} days`}
        onAdd={() => setSheet('workout')}
      />

      <div className="view">
        <div className="row row--between" style={{ flexWrap: 'wrap' }}>
          <Segmented options={RANGES} value={range} onChange={setRange} label="Time range" />
          <span className="card__sub">
            {totals.goalDays} of {window.length} days at goal
          </span>
        </div>

        <div className="grid grid--tiles">
          <StatTile
            label="Daily average"
            value={num(avgSteps)}
            unit="steps"
            color="var(--steps)"
            trend={window.slice(-12).map((d) => d.steps)}
            hint={stepsDelta == null ? 'Whole demo history' : undefined}
            delta={
              stepsDelta == null
                ? undefined
                : {
                    direction: stepsDelta > 0 ? 'up' : stepsDelta < 0 ? 'down' : 'flat',
                    good: stepsDelta >= 0,
                    label: `${compact(Math.abs(stepsDelta))} vs prev ${range}d`,
                  }
            }
          />
          <StatTile
            label="Distance"
            value={dist.value}
            unit={dist.unit}
            color="var(--steps)"
            hint={`Total across ${window.length} days`}
          />
          <StatTile
            label="Active energy"
            value={compact(totals.kcal)}
            unit="kcal"
            color="var(--energy)"
            trend={window.slice(-12).map((d) => d.activeCalories)}
          />
          <StatTile
            label="Exercise"
            value={duration(totals.minutes)}
            color="var(--energy)"
            hint={`${Math.round(totals.minutes / window.length)} min/day average`}
          />
        </div>

        <ChartCard
          title="Steps"
          subtitle={`Daily total against a ${compact(goals.steps)} step goal`}
          table={{
            columns: ['Day', 'Steps', 'Active kcal', 'Exercise'],
            rows: window
              .slice()
              .reverse()
              .map((d) => [
                shortDate(d.date),
                num(d.steps),
                num(d.activeCalories),
                duration(d.exerciseMinutes),
              ]),
          }}
        >
          <ColumnChart
            data={stepSeries}
            color="var(--steps)"
            goal={goals.steps}
            unit="steps"
            height={range === 7 ? 190 : 210}
            format={(v) => num(v)}
          />
        </ChartCard>

        <div className="grid grid--cols">
          <ChartCard
            title="Resting heart rate"
            subtitle={`Beats per minute, last ${range} days`}
            table={{
              columns: ['Day', 'Resting bpm', 'HRV (ms)'],
              rows: window
                .slice()
                .reverse()
                .map((d) => [shortDate(d.date), d.restingHr, d.hrv]),
            }}
          >
            <LineChart data={hrSeries} unit="bpm" color="var(--heart)" wash="var(--heart-wash)" />
          </ChartCard>

          <ChartCard
            title="Heart rate today"
            subtitle="Every 30 minutes, midnight to midnight"
            table={{
              columns: ['Time', 'bpm'],
              rows: intraday.filter((_, i) => i % 4 === 0).map((p) => [p.full, p.value]),
            }}
          >
            <LineChart
              data={intraday}
              unit="bpm"
              color="var(--heart)"
              wash="var(--heart-wash)"
              xTickEvery={8}
              endLabel={false}
            />
          </ChartCard>
        </div>

        <Card
          title="Recent workouts"
          subtitle={`${recentWorkouts.length} sessions in this range`}
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
          {recentWorkouts.length ? (
            <div className="list">
              {recentWorkouts.map((w) => (
                <div className="list__item" key={w.id}>
                  <span className="list__icon" aria-hidden="true">
                    {w.icon}
                  </span>
                  <div className="list__body">
                    <div className="list__title">{w.type}</div>
                    <div className="list__meta">
                      {shortDate(w.date)} · {duration(w.minutes)} · avg {w.avgHr} bpm
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
            <p className="card__sub">No sessions in this range.</p>
          )}
        </Card>
      </div>

      <LogSheet
        key={sheet}
        open={sheet != null}
        initialMode={sheet ?? 'workout'}
        onClose={() => setSheet(null)}
      />
    </>
  );
}
