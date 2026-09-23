import {
  IconActivity,
  IconNutrition,
  IconProfile,
  IconSleep,
  IconToday,
} from './Icons.jsx';

export const TABS = [
  { id: 'today', label: 'Today', Icon: IconToday },
  { id: 'activity', label: 'Activity', Icon: IconActivity },
  { id: 'nutrition', label: 'Food', Icon: IconNutrition },
  { id: 'sleep', label: 'Sleep', Icon: IconSleep },
  { id: 'profile', label: 'Profile', Icon: IconProfile },
];

/** One layout, two navigation shapes: a bottom tab bar on phones and tablets,
 *  a persistent sidebar from 900px up. Both render the same screens. */
export default function AppShell({ tab, onTab, children }) {
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Sections">
        <div className="sidebar__brand">
          <span aria-hidden="true">💠</span> Pulse
        </div>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className="sidebar__item"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => onTab(id)}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
        <p className="sidebar__foot">
          Demo interface · synthetic data
          <br />
          Not a medical device.
        </p>
      </nav>

      <main className="main">{children}</main>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className="tabbar__item"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => onTab(id)}
          >
            <Icon size={21} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
