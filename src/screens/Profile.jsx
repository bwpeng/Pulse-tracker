import { useMemo } from 'react';
import Card from '../components/Card.jsx';
import ChartCard from '../components/ChartCard.jsx';
import LineChart from '../components/LineChart.jsx';
import Segmented from '../components/Segmented.jsx';
import TopBar from '../components/TopBar.jsx';
import { useApp } from '../store/AppStore.jsx';
import { height, num, shortDate, volume, weight } from '../lib/format.js';

const GOAL_FIELDS = [
  { key: 'steps', label: 'Daily steps', step: 500, unit: '' },
  { key: 'activeCalories', label: 'Active energy', step: 20, unit: 'kcal' },
  { key: 'waterMl', label: 'Water', step: 250, unit: 'ml' },
  { key: 'sleepMinutes', label: 'Sleep', step: 15, unit: 'min' },
  { key: 'calories', label: 'Calorie budget', step: 50, unit: 'kcal' },
];

export default function Profile() {
  const { state, dispatch, days, profile, units, notify, goals } = useApp();
  const { theme } = state.settings;

  const weightSeries = useMemo(
    () =>
      days
        // Sample from the end so the last point is always today — otherwise the
        // chart's end label disagrees with the "Current" figure above it.
        .filter((_, i) => (days.length - 1 - i) % 3 === 0)
        .map((d) => ({
          label: shortDate(d.date),
          full: shortDate(d.date),
          value:
            units === 'imperial' ? Number((d.weightKg * 2.20462).toFixed(1)) : d.weightKg,
        })),
    [days, units]
  );

  const current = weight(days[days.length - 1].weightKg, units);
  const target = weight(profile.targetWeightKg, units);
  const start = weight(profile.startWeightKg, units);
  const bodyHeight = height(profile.heightCm, units);

  return (
    <>
      <TopBar title="Profile" subtitle="Goals, units and connected devices" />

      <div className="view">
        <Card>
          <div className="row" style={{ gap: 14 }}>
            <div
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: 'var(--steps-wash)',
                color: 'var(--steps)',
                fontWeight: 680,
                fontSize: 19,
              }}
            >
              {profile.initials}
            </div>
            <div>
              <h2 className="card__title" style={{ fontSize: 17 }}>
                {profile.name}
              </h2>
              <p className="card__sub">
                {profile.age} years · {bodyHeight.value} {bodyHeight.unit} · {current.value}{' '}
                {current.unit}
              </p>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 16 }}>
            {[
              { label: 'Start', value: `${start.value} ${start.unit}` },
              { label: 'Current', value: `${current.value} ${current.unit}` },
              { label: 'Target', value: `${target.value} ${target.unit}` },
            ].map((item) => (
              <div key={item.label}>
                <p className="card__sub">{item.label}</p>
                <p style={{ fontSize: 17, fontWeight: 620 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <ChartCard
          title="Weight"
          subtitle={`Last 90 days, in ${current.unit}`}
          table={{
            columns: ['Date', `Weight (${current.unit})`],
            rows: weightSeries.slice().reverse().map((p) => [p.full, p.value]),
          }}
        >
          <LineChart
            data={weightSeries}
            unit={current.unit}
            color="var(--steps)"
            wash="var(--steps-wash)"
            format={(v) => num(v, 1)}
            xTickEvery={6}
          />
        </ChartCard>

        <Card title="Daily goals" subtitle="Tuning these updates every screen">
          <div className="list">
            {GOAL_FIELDS.map((field) => {
              const value = goals[field.key];
              const display =
                field.key === 'waterMl'
                  ? `${volume(value, units).value} ${volume(value, units).unit}`
                  : `${num(value)}${field.unit ? ` ${field.unit}` : ''}`;
              return (
                <div className="list__item" key={field.key}>
                  <div className="list__body">
                    <div className="list__title">{field.label}</div>
                    <div className="list__meta">{display}</div>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ width: 38, height: 38 }}
                      aria-label={`Decrease ${field.label}`}
                      onClick={() =>
                        dispatch({
                          type: 'setGoal',
                          key: field.key,
                          value: Math.max(field.step, value - field.step),
                        })
                      }
                    >
                      –
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ width: 38, height: 38 }}
                      aria-label={`Increase ${field.label}`}
                      onClick={() =>
                        dispatch({ type: 'setGoal', key: field.key, value: value + field.step })
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Preferences">
          <div className="list">
            <div className="list__item">
              <div className="list__body">
                <div className="list__title">Appearance</div>
                <div className="list__meta">System follows the device setting</div>
              </div>
              <Segmented
                label="Appearance"
                value={theme}
                onChange={(value) => dispatch({ type: 'setSetting', key: 'theme', value })}
                options={[
                  { value: 'system', label: 'Auto' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </div>
            <div className="list__item">
              <div className="list__body">
                <div className="list__title">Units</div>
                <div className="list__meta">Applies to weight, distance and volume</div>
              </div>
              <Segmented
                label="Units"
                value={units}
                onChange={(value) => dispatch({ type: 'setSetting', key: 'units', value })}
                options={[
                  { value: 'metric', label: 'Metric' },
                  { value: 'imperial', label: 'Imperial' },
                ]}
              />
            </div>
            <div className="list__item">
              <div className="list__body">
                <div className="list__title">Table view under charts</div>
                <div className="list__meta">Show every chart's numbers as a table</div>
              </div>
              <Segmented
                label="Table view"
                value={state.settings.showTables ? 'on' : 'off'}
                onChange={(value) =>
                  dispatch({ type: 'setSetting', key: 'showTables', value: value === 'on' })
                }
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'on', label: 'On' },
                ]}
              />
            </div>
            <div className="list__item">
              <div className="list__body">
                <div className="list__title">Reminders</div>
                <div className="list__meta">Hydration and bedtime nudges</div>
              </div>
              <Segmented
                label="Reminders"
                value={state.settings.reminders ? 'on' : 'off'}
                onChange={(value) =>
                  dispatch({ type: 'setSetting', key: 'reminders', value: value === 'on' })
                }
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'on', label: 'On' },
                ]}
              />
            </div>
          </div>
        </Card>

        <Card title="Connected devices" subtitle="Simulated — nothing is actually paired">
          <div className="list">
            {profile.connectedDevices.map((device) => (
              <div className="list__item" key={device.id}>
                <span className="list__icon" aria-hidden="true">
                  {device.icon}
                </span>
                <div className="list__body">
                  <div className="list__title">{device.name}</div>
                  <div className="list__meta">{device.detail}</div>
                </div>
                <span className="list__value" style={{ color: 'var(--good-text)' }}>
                  ● Linked
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Demo data">
          <p className="card__sub" style={{ marginBottom: 12 }}>
            Ninety days of synthetic history are generated on device from a fixed seed. Anything
            you log is kept in this browser only; resetting clears it.
          </p>
          <button
            type="button"
            className="btn btn--block"
            onClick={() => {
              dispatch({ type: 'reset' });
              notify('Demo data reset');
            }}
          >
            Reset demo data
          </button>
        </Card>

        <p className="banner">
          <span aria-hidden="true">ℹ️</span>
          <span>
            Pulse is a front-end demo. It is not a medical device and gives no medical advice.
          </span>
        </p>
      </div>
    </>
  );
}
