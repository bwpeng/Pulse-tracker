import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import Toast from './components/Toast.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Today from './pages/Today.jsx';
import Activity from './pages/Activity.jsx';
import Nutrition from './pages/Nutrition.jsx';
import Sleep from './pages/Sleep.jsx';
import Profile from './pages/Profile.jsx';
import { useApp } from './store/AppStore.jsx';

function Splash({ title, body, children }) {
  return (
    <div className="splash">
      <div className="splash__inner">
        <span className="splash__mark" aria-hidden="true">💠</span>
        <h1 className="splash__title">{title}</h1>
        {body && <p className="splash__body">{body}</p>}
        {children}
      </div>
    </div>
  );
}

/** Gate for everything under /app: waits for the session check, then either
 *  renders the shell or sends you to the login screen. */
function RequireAuth() {
  const { status, error, reload } = useApp();
  const location = useLocation();

  if (status === 'loading') {
    return <Splash title="Loading your data…" body="Reading the last ninety days from the API." />;
  }

  if (status === 'error') {
    return (
      <Splash
        title="The API is not reachable"
        body={error ?? 'Start the server with npm run dev, then try again.'}
      >
        <button type="button" className="btn btn--primary" onClick={reload}>
          Retry
        </button>
      </Splash>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  const { toast } = useApp();

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<RequireAuth />}>
          <Route index element={<Navigate to="/app/today" replace />} />
          <Route path="today" element={<Today />} />
          <Route path="activity" element={<Activity />} />
          <Route path="food" element={<Nutrition />} />
          <Route path="sleep" element={<Sleep />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast message={toast} />
    </>
  );
}
