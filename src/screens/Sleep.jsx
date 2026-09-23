import { useMemo } from 'react';
import Card from '../components/Card.jsx';
import ChartCard from '../components/ChartCard.jsx';
import StackedBarChart from '../components/StackedBarChart.jsx';
import StatTile from '../components/StatTile.jsx';
import TopBar from '../components/TopBar.jsx';
import { useApp } from '../store/AppStore.jsx';
import { clockFromMinutes, duration, num, shortDate, weekday } from '../lib/format.js';

/* Sleep stages are ordered, not categorical, so they take steps of one
 * sequential blue ramp — deepest stage darkest — with "awake" in neutral gray.
 * Legend plus tooltip carry identity; the 2px surface gaps separate segments. */
const STAGES = [
  { key: 'deep', label: 'Deep', color: 'var(--seq-600)' },
  { key: 'rem', label: 'REM', color: 'var(--seq-450)' },
  { key: 'light', label: 'Light', color: 'var(--seq-300)' },
  { key: 'awake', label: 'Awake', color: 'var(--axis)' },
];

export default function Sleep() {
  const { days, goals } = useApp();
  const last = days[days.length - 1].sleep;

  const week = useMemo(
    () =>
      days.slice(-7).map((d) => ({
        label: weekday(d.date),
        full: shortDate(d.date),
        deep: d.sleep.deep,
        rem: d.sleep.rem,
        light: d.sleep.light,
        awake: d.sleep.awake,
        asleep: d.sleep.asleepMinutes,
        bedtime: d.sleep.bedtimeMinutes,
        efficiency: d.sleep.efficiency,
      })),
    [days]
  );

  const avgAsleep = Math.round(week.reduce((s, d) => s + d.asleep, 0) / week.length);
  const avgEfficiency = Math.round(week.reduce((s, d) => s + d.efficiency, 0) / week.length);
  const avgBedtime = Math.round(week.reduce((s, d) => s + d.bedtime, 0) / week.length);
  const goalDelta = last.asleepMinutes - goals.sleepMinutes;
  const deepShare = Math.round((last.deep / last.asleepMinutes) * 100);

  return (
    <>
      <TopBar title="Sleep" subtitle="Last night and the past week" />

      <div className="view">
        <Card>
          <p className="card__sub">Time asleep last night</p>
          <p className="hero">
            {duration(last.asleepMinutes)}
            <span className="units">goal {duration(goals.sleepMinutes)}</span>
          </p>
          <p className="secondary" style={{ fontSize: 13, marginTop: 4 }}>
            Asleep {clockFromMinutes(last.bedtimeMinutes)} · awake{' '}
            {clockFromMinutes(last.bedtimeMinutes + last.asleepMinutes + last.awake)} ·{' '}
            {goalDelta >= 0
              ? `${duration(goalDelta)} over goal`
              : `${duration(Math.abs(goalDelta))} short of goal`}
          </p>
        </Card>

        <div className="grid grid--tiles">
          <StatTile
            label="Weekly average"
            value={duration(avgAsleep)}
            color="var(--seq-450)"
            trend={days.slice(-12).map((d) => d.sleep.asleepMinutes)}
          />
          <StatTile label="Efficiency" value={avgEfficiency} unit="%" color="var(--seq-600)" hint="Asleep vs in bed" />
          <StatTile label="Deep sleep" value={deepShare} unit="%" color="var(--seq-600)" hint={`${last.deep} min last night`} />
          <StatTile
            label="Typical bedtime"
            value={clockFromMinutes(avgBedtime)}
            color="var(--text-muted)"
            hint="7-night average"
          />
        </div>

        <ChartCard
          title="Sleep stages"
          subtitle="Minutes per night, last 7 nights"
          legend={STAGES.map((s) => ({ label: s.label, color: s.color }))}
          table={{
            columns: ['Night', 'Deep', 'REM', 'Light', 'Awake', 'Total'],
            rows: week
              .slice()
              .reverse()
              .map((d) => [d.full, d.deep, d.rem, d.light, d.awake, duration(d.asleep)]),
          }}
        >
          <StackedBarChart
            data={week}
            series={STAGES}
            unit="min"
            format={(v) => num(v)}
            totalFormat={(v) => duration(v)}
          />
        </ChartCard>

        <Card title="Nightly detail" subtitle="Bedtime, wake time and efficiency">
          <div className="list">
            {week
              .slice()
              .reverse()
              .map((night) => (
                <div className="list__item" key={night.full}>
                  <span className="list__icon" aria-hidden="true">
                    🌙
                  </span>
                  <div className="list__body">
                    <div className="list__title">{night.full}</div>
                    <div className="list__meta">
                      {clockFromMinutes(night.bedtime)} →{' '}
                      {clockFromMinutes(night.bedtime + night.asleep + night.awake)} ·{' '}
                      {night.efficiency}% efficiency
                    </div>
                  </div>
                  <span className="list__value">{duration(night.asleep)}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </>
  );
}
