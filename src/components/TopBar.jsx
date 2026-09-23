import { IconMoon, IconPlus, IconSun } from './Icons.jsx';
import { useApp } from '../store/AppStore.jsx';

export default function TopBar({ title, subtitle, onAdd }) {
  const { state, dispatch } = useApp();
  const { theme } = state.settings;
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <header className="topbar">
      <div>
        <h1 className="topbar__title">{title}</h1>
        {subtitle && <p className="topbar__sub">{subtitle}</p>}
      </div>
      <div className="topbar__actions">
        <button
          type="button"
          className="icon-btn"
          aria-label={`Switch to ${next} theme`}
          onClick={() => dispatch({ type: 'setSetting', key: 'theme', value: next })}
        >
          {theme === 'dark' ? <IconSun size={19} /> : <IconMoon size={19} />}
        </button>
        {onAdd && (
          <button type="button" className="icon-btn" aria-label="Log something" onClick={onAdd}>
            <IconPlus size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
