/* Small, self-contained visuals used on the landing page — one per section, so
 * each card shows the kind of chart that page is actually made of rather than a
 * generic icon. Shapes only: no axes, no labels, no interaction. */

const ringGeometry = (index, stroke = 9, gap = 4, size = 92) => {
  const center = size / 2;
  const radius = center - stroke / 2 - index * (stroke + gap);
  return { center, radius, circumference: 2 * Math.PI * radius };
};

export function RingsPreview({ values = [0.86, 0.91, 0.72], size = 92 }) {
  const colors = ['var(--energy)', 'var(--steps)', 'var(--hydration)'];
  const tracks = ['var(--energy-wash)', 'var(--steps-wash)', 'var(--hydration-wash)'];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {values.map((value, i) => {
        const { center, radius, circumference } = ringGeometry(i, 9, 4, size);
        return (
          <g key={i} transform={`rotate(-90 ${center} ${center})`}>
            <circle cx={center} cy={center} r={radius} fill="none" stroke={tracks[i]} strokeWidth="9" />
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={colors[i]}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${circumference * Math.min(1, value)} ${circumference}`}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function ColumnsPreview({ values = [0.62, 0.78, 0.45, 0.83, 0.7, 0.95, 0.88], color = 'var(--steps)' }) {
  const w = 132;
  const h = 64;
  const band = w / values.length;
  const barW = Math.min(12, band * 0.56);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <line x1="0" x2={w} y1={h - 10} y2={h - 10} stroke="var(--grid)" strokeWidth="1" />
      {values.map((v, i) => {
        const barH = Math.max(4, v * (h - 16));
        return (
          <rect
            key={i}
            x={i * band + (band - barW) / 2}
            y={h - 10 - barH}
            width={barW}
            height={barH}
            rx="3"
            fill={color}
          />
        );
      })}
    </svg>
  );
}

export function MacrosPreview() {
  const w = 132;
  const h = 64;
  const days = [
    [0.3, 0.44, 0.16],
    [0.34, 0.4, 0.18],
    [0.28, 0.46, 0.2],
    [0.32, 0.38, 0.17],
    [0.36, 0.42, 0.14],
  ];
  const band = w / days.length;
  const barW = Math.min(14, band * 0.58);
  const colors = ['var(--steps)', 'var(--energy)', 'var(--hydration)'];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <line x1="0" x2={w} y1={h - 10} y2={h - 10} stroke="var(--grid)" strokeWidth="1" />
      {days.map((stack, i) => {
        let cursor = h - 10;
        return (
          <g key={i}>
            {stack.map((part, j) => {
              const segH = part * (h - 14);
              cursor -= segH + (j ? 2 : 0);
              return (
                <rect
                  key={j}
                  x={i * band + (band - barW) / 2}
                  y={cursor}
                  width={barW}
                  height={segH}
                  rx={j === stack.length - 1 ? 3 : 0}
                  fill={colors[j]}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function SleepPreview() {
  const w = 132;
  const h = 64;
  const nights = [
    [0.22, 0.26, 0.46],
    [0.18, 0.3, 0.44],
    [0.26, 0.22, 0.48],
    [0.2, 0.28, 0.4],
    [0.24, 0.24, 0.5],
  ];
  const band = w / nights.length;
  const barW = Math.min(14, band * 0.58);
  const colors = ['var(--seq-600)', 'var(--seq-450)', 'var(--seq-300)'];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <line x1="0" x2={w} y1={h - 10} y2={h - 10} stroke="var(--grid)" strokeWidth="1" />
      {nights.map((stack, i) => {
        let cursor = h - 10;
        return (
          <g key={i}>
            {stack.map((part, j) => {
              const segH = part * (h - 14);
              cursor -= segH + (j ? 2 : 0);
              return (
                <rect
                  key={j}
                  x={i * band + (band - barW) / 2}
                  y={cursor}
                  width={barW}
                  height={segH}
                  rx={j === stack.length - 1 ? 3 : 0}
                  fill={colors[j]}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function LinePreview({ color = 'var(--steps)', wash = 'var(--steps-wash)' }) {
  const w = 132;
  const h = 64;
  const points = [0.82, 0.78, 0.74, 0.72, 0.66, 0.6, 0.57, 0.5, 0.46, 0.4, 0.34, 0.3];
  const x = (i) => (i / (points.length - 1)) * (w - 8) + 4;
  const y = (v) => h - 10 - v * (h - 22);
  const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={`${line} L${x(points.length - 1)},${h - 10} L${x(0)},${h - 10} Z`} fill={wash} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r="3.5" fill={color} stroke="var(--surface-1)" strokeWidth="2" />
    </svg>
  );
}

export function HeartPreview() {
  const w = 132;
  const h = 64;
  const beats = [0.4, 0.42, 0.38, 0.9, 0.2, 0.45, 0.4, 0.44, 0.4, 0.85, 0.22, 0.44, 0.4, 0.42];
  const x = (i) => (i / (beats.length - 1)) * (w - 8) + 4;
  const y = (v) => h - 10 - v * (h - 22);
  const line = beats.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={line} fill="none" stroke="var(--heart)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
