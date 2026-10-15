import Sparkline from './Sparkline.jsx';

/** label · value · optional signed delta vs a named period · optional trend. */
export default function StatTile({ label, value, unit, color, delta, trend, hint }) {
  const tone =
    delta == null || delta.direction === 'flat'
      ? 'delta--flat'
      : delta.good
        ? 'delta--good'
        : 'delta--bad';
  const arrow = delta?.direction === 'up' ? '▲' : delta?.direction === 'down' ? '▼' : '–';

  return (
    <div className="tile">
      <div className="tile__label">
        {color && <span className="tile__dot" style={{ background: color }} />}
        {label}
      </div>
      <div className="tile__value">
        {value}
        {unit && <span className="units">{unit}</span>}
      </div>
      {delta && (
        <div className={`tile__delta ${tone}`}>
          <span aria-hidden="true">{arrow}</span>
          {delta.label}
        </div>
      )}
      {!delta && hint && <div className="tile__delta delta--flat">{hint}</div>}
      {trend && <Sparkline values={trend} color={color ?? 'var(--steps)'} />}
    </div>
  );
}
