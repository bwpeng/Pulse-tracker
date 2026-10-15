export default function Card({ title, subtitle, action, children, as: Tag = 'section', ...rest }) {
  return (
    <Tag className="card" {...rest}>
      {(title || action) && (
        <header className="card__head">
          <div>
            {title && <h2 className="card__title">{title}</h2>}
            {subtitle && <p className="card__sub">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </Tag>
  );
}
