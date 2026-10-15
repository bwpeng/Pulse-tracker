import { useState } from 'react';
import useMeasure from '../lib/useMeasure.js';
import { barPath, clampTip, niceTicks } from '../lib/chart.js';

/** Stacked columns with a 2px surface gap between every segment — the gap is
 *  what separates the marks, never a stroke. Legend is mandatory here. */
export default function StackedBarChart({
  data,
  series,
  height = 200,
  format = (v) => Math.round(v).toLocaleString('en-US'),
  unit = '',
  totalFormat,
}) {
  const [ref, width] = useMeasure();
  const [active, setActive] = useState(null);

  const pad = { top: 20, right: 8, bottom: 22, left: 38 };
  const plotW = Math.max(40, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;

  const totals = data.map((d) => series.reduce((sum, s) => sum + (d[s.key] ?? 0), 0));
  const ticks = niceTicks(Math.max(...totals), 3);
  const axisMax = ticks[ticks.length - 1] || 1;
  const y = (v) => pad.top + plotH - (v / axisMax) * plotH;

  const band = plotW / data.length;
  const barW = Math.min(24, band * 0.62);
  const GAP = 2;

  const point = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - rect.left - pad.left) / band);
    setActive(index >= 0 && index < data.length ? index : null);
  };

  const activeDatum = active != null ? data[active] : null;

  return (
    <div className="chart" ref={ref}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={data
          .map(
            (d, i) =>
              `${d.full ?? d.label}: total ${format(totals[i])}, ` +
              series.map((s) => `${s.label} ${format(d[s.key] ?? 0)}`).join(', ')
          )
          .join('. ')}
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
              {format(tick)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const barX = pad.left + i * band + (band - barW) / 2;
          let cursor = 0;
          const dim = active != null && active !== i;
          return (
            <g key={d.label + i} opacity={dim ? 0.45 : 1}>
              {series.map((s, si) => {
                const value = d[s.key] ?? 0;
                if (value <= 0) return null;
                const top = y(cursor + value);
                const bottom = y(cursor);
                cursor += value;
                const isTop = si === series.length - 1;
                const h = Math.max(0, bottom - top - (si === 0 ? 0 : GAP));
                const segY = si === 0 ? top : top + GAP;
                return isTop ? (
                  <path key={s.key} d={barPath(barX, segY, barW, h)} fill={s.color} />
                ) : (
                  <rect key={s.key} x={barX} y={segY} width={barW} height={h} fill={s.color} />
                );
              })}
              <text className="axis-label" x={barX + barW / 2} y={height - 6} textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {activeDatum && (
        <div
          className="chart__tip"
          style={{
            left: clampTip(pad.left + active * band + band / 2, width, 165),
            top: Math.max(24, y(totals[active]) - 10),
            minWidth: 160,
          }}
        >
          <div className="chart__tip-title">{activeDatum.full ?? activeDatum.label}</div>
          {series
            .slice()
            .reverse()
            .map((s) => (
              <div className="chart__tip-row" key={s.key}>
                <span className="chart__tip-key">
                  <span className="legend__swatch" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="chart__tip-val">{format(activeDatum[s.key] ?? 0)}</span>
              </div>
            ))}
          <div
            className="chart__tip-row"
            style={{ borderTop: '1px solid var(--border)', marginTop: 5, paddingTop: 5 }}
          >
            <span className="chart__tip-key">Total {unit}</span>
            <span className="chart__tip-val">
              {(totalFormat ?? format)(totals[active])}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
