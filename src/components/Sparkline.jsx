import { useId } from 'react';

/** 12-point trend for a stat tile: the run in a de-emphasised step of the
 *  metric's own hue, the current point in the accent. No axes, no labels — the
 *  tile's value carries the number. */
export default function Sparkline({ values, color = 'var(--steps)', width = 96, height = 30 }) {
  const id = useId();
  if (!values.length) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i) => (i / Math.max(1, values.length - 1)) * (width - 6) + 3;
  const y = (v) => height - 4 - ((v - min) / span) * (height - 10);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="78%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#spark-${id})`} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle
        cx={x(values.length - 1)}
        cy={y(values[values.length - 1])}
        r="3.2"
        fill={color}
        stroke="var(--surface-1)"
        strokeWidth="2"
      />
    </svg>
  );
}
