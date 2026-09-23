import { useState } from 'react';
import useMeasure from '../lib/useMeasure.js';
import { barPath, clampTip, niceTicks } from '../lib/chart.js';

/** Single-series columns with an optional goal reference line.
 *  Hover/touch gives a per-mark tooltip; the extreme and the latest column are
 *  the only ones labelled directly. */
export default function ColumnChart({
  data,
  color = 'var(--steps)',
  goal,
  height = 176,
  format = (v) => Math.round(v).toLocaleString('en-US'),
  unit = '',
  highlightLast = true,
}) {
  const [ref, width] = useMeasure();
  const [active, setActive] = useState(null);

  const pad = { top: 22, right: 8, bottom: 22, left: 34 };
  const plotW = Math.max(40, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;

  const dataMax = Math.max(...data.map((d) => d.value), goal ?? 0);
  const ticks = niceTicks(dataMax, 3);
  const axisMax = ticks[ticks.length - 1] || 1;
  const y = (v) => pad.top + plotH - (v / axisMax) * plotH;

  const band = plotW / data.length;
  const barW = Math.min(24, band * 0.62);
  const maxIndex = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  const labelled = new Set([maxIndex]);
  if (highlightLast) labelled.add(data.length - 1);

  // Thin the category labels to whatever the band width can actually hold, so a
  // 90-day range doesn't print 90 overlapping ticks. Width is estimated from
  // the longest label rather than assumed — "Jun 19" needs far more room than "M".
  const labelPx = Math.max(...data.map((d) => String(d.label).length)) * 6.3 + 12;
  const tickEvery = Math.max(1, Math.ceil(labelPx / band));
  const showTick = (i) => i % tickEvery === 0;

  const point = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - pad.left;
    const index = Math.floor(x / band);
    setActive(index >= 0 && index < data.length ? index : null);
  };

  const activeDatum = active != null ? data[active] : null;

  return (
    <div className="chart" ref={ref}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={data.map((d) => `${d.label}: ${format(d.value)} ${unit}`).join(', ')}
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
              stroke={tick === 0 ? 'var(--axis)' : 'var(--grid)'}
              strokeWidth="1"
            />
            <text className="axis-label" x={pad.left - 8} y={y(tick) + 4} textAnchor="end">
              {tick >= 10000 ? `${tick / 1000}K` : tick.toLocaleString('en-US')}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const barX = pad.left + i * band + (band - barW) / 2;
          const barY = y(d.value);
          const h = pad.top + plotH - barY;
          const isActive = active === i;
          return (
            <g key={d.label + i}>
              <path
                d={barPath(barX, barY, barW, h)}
                fill={color}
                opacity={active == null || isActive ? 1 : 0.55}
              />
              {labelled.has(i) && h > 14 && (
                <text className="mark-label" x={barX + barW / 2} y={barY - 7} textAnchor="middle">
                  {format(d.value)}
                </text>
              )}
              {(showTick(i) || isActive) && (
                <text
                  className="axis-label"
                  x={barX + barW / 2}
                  y={height - 6}
                  textAnchor="middle"
                  style={isActive ? { fill: 'var(--text-primary)', fontWeight: 600 } : undefined}
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        {/* drawn after the bars so its label plate is never painted over */}
        {goal ? (
          <g>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(goal)}
              y2={y(goal)}
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="1 0"
              opacity="0.85"
            />
            <rect
              x={width - pad.right - 32}
              y={y(goal) - 17}
              width={32}
              height={14}
              fill="var(--surface-1)"
            />
            <text
              className="axis-label"
              x={width - pad.right}
              y={y(goal) - 6}
              textAnchor="end"
              style={{ fontWeight: 600 }}
            >
              Goal
            </text>
          </g>
        ) : null}

      </svg>

      {activeDatum && (
        <div
          className="chart__tip"
          style={{
            left: clampTip(pad.left + active * band + band / 2, width),
            top: Math.max(26, y(activeDatum.value) - 10),
          }}
        >
          <div className="chart__tip-title">{activeDatum.full ?? activeDatum.label}</div>
          <div className="chart__tip-row">
            <span className="chart__tip-key">
              <span className="legend__swatch" style={{ background: color }} />
              {unit || 'Value'}
            </span>
            <span className="chart__tip-val">{format(activeDatum.value)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
