import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  IconActivity,
  IconNutrition,
  IconProfile,
  IconSleep,
  IconToday,
} from './Icons.jsx';
import { useApp } from '../store/AppStore.jsx';

export const TABS = [
  { to: '/app/today', label: 'Today', Icon: IconToday },
  { to: '/app/activity', label: 'Activity', Icon: IconActivity },
  { to: '/app/food', label: 'Food', Icon: IconNutrition },
  { to: '/app/sleep', label: 'Sleep', Icon: IconSleep },
  { to: '/app/profile', label: 'Profile', Icon: IconProfile },
];

/** One layout, two navigation shapes: a bottom tab bar on phones and tablets,
 *  a persistent sidebar from 900px up. Both render the same screens. */
export default function AppShell({ children }) {
  const { user } = useApp();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Sections">
        <NavLink className="sidebar__brand" to="/">
          <span aria-hidden="true">💠</span> Pulse
        </NavLink>
        {TABS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className="sidebar__item">
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
        <div className="sidebar__foot">
          <div className="sidebar__user">
            <span className="sidebar__avatar" aria-hidden="true">{user?.initials}</span>
            <span>
              <strong>{user?.name}</strong>
              <br />
              <span className="muted">Demo account</span>
            </span>
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            Synthetic data · not a medical device
          </p>
        </div>
      </nav>

      <main className="main">{children}</main>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className="tabbar__item">
            <Icon size={21} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
