/** Three concentric meters. Only three hues are ever on screen together as a
 *  colour-coded set — the validated all-pairs cap — and every ring carries a
 *  direct label beside it, so the reading never depends on hue alone. */
export default function ActivityRings({ rings, size = 168 }) {
  const stroke = 14;
  const gap = 5;
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={rings
        .map((r) => `${r.label}: ${r.value} of ${r.goal} ${r.unit}`)
        .join('. ')}
    >
      {rings.map((ring, i) => {
        const radius = center - stroke / 2 - i * (stroke + gap);
        const circumference = 2 * Math.PI * radius;
        const ratio = ring.goal > 0 ? Math.min(1, ring.value / ring.goal) : 0;
        return (
          <g key={ring.label} transform={`rotate(-90 ${center} ${center})`}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={ring.track}
              strokeWidth={stroke}
            />
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={ring.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${circumference * ratio} ${circumference}`}
              style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
          </g>
        );
      })}
    </svg>
  );
}
