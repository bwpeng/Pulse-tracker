import { useEffect, useState } from 'react';
import AppShell, { TABS } from './components/AppShell.jsx';
import Toast from './components/Toast.jsx';
import Today from './screens/Today.jsx';
import Activity from './screens/Activity.jsx';
import Nutrition from './screens/Nutrition.jsx';
import Sleep from './screens/Sleep.jsx';
import Profile from './screens/Profile.jsx';
import { useApp } from './store/AppStore.jsx';

const SCREENS = {
  today: Today,
  activity: Activity,
  nutrition: Nutrition,
  sleep: Sleep,
  profile: Profile,
};

const validTab = (value) => (TABS.some((t) => t.id === value) ? value : 'today');

export default function App() {
  const { toast } = useApp();
  const [tab, setTab] = useState(() => validTab(window.location.hash.slice(1)));

  /* Hash routing keeps the device back gesture / back button working, which is
   * what a tab bar is expected to do on Android and in a browser tab alike. */
  useEffect(() => {
    const onHash = () => setTab(validTab(window.location.hash.slice(1)));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (window.location.hash.slice(1) !== tab) window.location.hash = tab;
    window.scrollTo({ top: 0 });
  }, [tab]);

  const Screen = SCREENS[tab];

  return (
    <AppShell tab={tab} onTab={setTab}>
      <Screen />
      <Toast message={toast} />
    </AppShell>
  );
}
