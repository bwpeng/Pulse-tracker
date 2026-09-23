/** Track is a lighter step of the fill's own ramp, so state reads across the
 *  whole bar. Severity comes from the status palette, never a series colour. */
export default function Meter({ value, max, color = 'var(--steps)', label }) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      className="meter__track"
      role="meter"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-label={label}
    >
      <div
        className="meter__fill"
        style={{ width: `${ratio * 100}%`, background: color }}
      />
    </div>
  );
}
