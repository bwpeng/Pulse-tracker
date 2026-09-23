/** Always shown for two or more series — identity never rests on colour alone. */
export default function Legend({ items }) {
  return (
    <ul className="legend" style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
      {items.map((item) => (
        <li className="legend__item" key={item.label}>
          <span className="legend__swatch" style={{ background: item.color }} />
          {item.label}
          {item.value != null && <span className="muted">· {item.value}</span>}
        </li>
      ))}
    </ul>
  );
}
