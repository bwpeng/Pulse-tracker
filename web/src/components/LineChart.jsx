import { useState } from 'react';
import useMeasure from '../lib/useMeasure.js';
import { clampTip, niceTicks } from '../lib/chart.js';

/** Single-series line: 2px stroke, 10% area wash, crosshair + tooltip on hover
 *  and on touch, one end-dot with a 2px surface ring. */
export default function LineChart({
  data,
  color = 'var(--heart)',
  wash = 'var(--heart-wash)',
  height = 180,
  format = (v) => Math.round(v).toLocaleString('en-US'),
  unit = '',
  zeroBased = false,
  xTickEvery,
  endLabel = true,
}) {
  const [ref, width] = useMeasure();
  const [active, setActive] = useState(null);

  const pad = { top: 20, right: 14, bottom: 22, left: 38 };
  const plotW = Math.max(40, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || 1;
  const min = zeroBased ? 0 : Math.max(0, rawMin - span * 0.25);
  const ticks = zeroBased
    ? niceTicks(rawMax, 3)
    : [min, min + (rawMax + span * 0.15 - min) / 2, rawMax + span * 0.15];
  const max = ticks[ticks.length - 1];

  const x = (i) => pad.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v) => pad.top + plotH - ((v - min) / (max - min || 1)) * plotH;

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${pad.top + plotH} L${x(0)},${pad.top + plotH} Z`;

  // Tick spacing comes from the room the longest label actually needs, so dense
  // ranges thin out instead of overprinting.
  const labelPx = Math.max(...data.map((d) => String(d.label).length)) * 6.3 + 14;
  const perPoint = plotW / Math.max(1, data.length - 1);
  const step = Math.max(xTickEvery ?? 1, Math.ceil(labelPx / perPoint));
  // The final tick is kept only when it clears the one before it — two labels
  // sharing the same pixels is worse than one.
  const showTick = (i) =>
    i === data.length - 1 ? (data.length - 1) % step === 0 : i % step === 0;
  const point = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const rel = event.clientX - rect.left - pad.left;
    const index = Math.round((rel / plotW) * (data.length - 1));
    setActive(index >= 0 && index < data.length ? index : null);
  };

  const activeDatum = active != null ? data[active] : null;
  const last = data[data.length - 1];

  return (
    <div className="chart" ref={ref}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${unit} over time, from ${format(data[0].value)} to ${format(last.value)}`}
        onPointerMove={point}
        onPointerDown={point}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--grid)"
              strokeWidth="1"
            />
            <text className="axis-label" x={pad.left - 8} y={y(tick) + 4} textAnchor="end">
              {format(tick)}
            </text>
          </g>
        ))}

        <path d={area} fill={wash} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {data.map((d, i) =>
          showTick(i) ? (
            <text
              key={`t${i}`}
              className="axis-label"
              x={x(i)}
              y={height - 6}
              textAnchor={i === data.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'}
            >
              {d.label}
            </text>
          ) : null
        )}

        {activeDatum && (
          <g>
            <line
              x1={x(active)}
              x2={x(active)}
              y1={pad.top}
              y2={pad.top + plotH}
              stroke="var(--axis)"
              strokeWidth="1"
            />
            <circle
              cx={x(active)}
              cy={y(activeDatum.value)}
              r="5"
              fill={color}
              stroke="var(--surface-1)"
              strokeWidth="2"
            />
          </g>
        )}

        <circle
          cx={x(data.length - 1)}
          cy={y(last.value)}
          r="4.5"
          fill={color}
          stroke="var(--surface-1)"
          strokeWidth="2"
        />
        {endLabel && (
          <text
            className="mark-label"
            x={x(data.length - 1)}
            y={y(last.value) - 12}
            textAnchor="end"
          >
            {format(last.value)}
          </text>
        )}
      </svg>

      {activeDatum && (
        <div
          className="chart__tip"
          style={{ left: clampTip(x(active), width), top: Math.max(24, y(activeDatum.value) - 12) }}
        >
          <div className="chart__tip-title">{activeDatum.full ?? activeDatum.label}</div>
          <div className="chart__tip-row">
            <span className="chart__tip-key">
              <span className="legend__swatch" style={{ background: color }} />
              {unit}
            </span>
            <span className="chart__tip-val">{format(activeDatum.value)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
