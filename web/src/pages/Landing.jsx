import { Link } from 'react-router-dom';
import {
  ColumnsPreview,
  HeartPreview,
  LinePreview,
  MacrosPreview,
  RingsPreview,
  SleepPreview,
} from '../components/Previews.jsx';
import { useApp } from '../store/AppStore.jsx';
import { compact, duration, num } from '../lib/format.js';

const SECTIONS = [
  {
    to: '/app/today',
    eyebrow: 'Today',
    title: 'Three rings, one glance',
    body: 'Move, steps and hydration against the goals you set, plus the day’s workouts, meals and a resting-heart-rate trend.',
    Preview: RingsPreview,
    accent: 'var(--steps)',
  },
  {
    to: '/app/activity',
    eyebrow: 'Activity',
    title: 'Seven, thirty or ninety days',
    body: 'Daily steps against the goal line, resting heart rate over the range, and every workout the account has logged.',
    Preview: ColumnsPreview,
    accent: 'var(--steps)',
  },
  {
    to: '/app/food',
    eyebrow: 'Food',
    title: 'A calorie budget that reacts',
    body: 'Log a meal and the budget meter, macro targets and the week’s stacked macros all move with it.',
    Preview: MacrosPreview,
    accent: 'var(--energy)',
  },
  {
    to: '/app/sleep',
    eyebrow: 'Sleep',
    title: 'Stages, not just hours',
    body: 'Deep, REM, light and awake for each of the last seven nights, with efficiency and bedtime drift.',
    Preview: SleepPreview,
    accent: 'var(--seq-450)',
  },
  {
    to: '/app/profile',
    eyebrow: 'Profile',
    title: 'Goals you can actually change',
    body: 'Edit a goal and every screen re-reads it. Units, theme and table view are stored on the account, not the browser.',
    Preview: LinePreview,
    accent: 'var(--hydration)',
  },
];

function Stat({ label, value, unit }) {
  return (
    <div className="landing__stat">
      <div className="landing__stat-value">
        {value}
        {unit && <span className="units">{unit}</span>}
      </div>
      <div className="landing__stat-label">{label}</div>
    </div>
  );
}

export default function Landing() {
  const { status, user, overview } = useApp();
  const signedIn = status === 'ready';

  return (
    <div className="landing">
      <header className="landing__bar">
        <span className="landing__brand">
          <span aria-hidden="true">💠</span> Pulse
        </span>
        <nav className="landing__bar-links">
          <a href="#sections">Screens</a>
          <a href="#how">How it works</a>
          {signedIn ? (
            <Link className="btn btn--sm btn--primary" to="/app/today">
              Open the app
            </Link>
          ) : (
            <Link className="btn btn--sm btn--primary" to="/login">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <section className="landing__hero">
        <div className="landing__hero-copy">
          <p className="landing__eyebrow">Health tracker · demo application</p>
          <h1 className="landing__title">
            Everything you logged, <span className="landing__title-accent">where you logged it</span>
          </h1>
          <p className="landing__lede">
            A cross-platform health tracker with a real back end: an Express API over SQLite, a
            React front end, session auth, and ninety days of history per account. Sign in with a
            demo account and every number on every screen comes out of the database.
          </p>
          <div className="landing__cta">
            {signedIn ? (
              <>
                <Link className="btn btn--primary" to="/app/today">
                  Continue as {user.name.split(' ')[0]}
                </Link>
                <Link className="btn btn--ghost" to="/app/activity">
                  Jump to activity
                </Link>
              </>
            ) : (
              <>
                <Link className="btn btn--primary" to="/login">
                  Try a demo account
                </Link>
                <a className="btn btn--ghost" href="#sections">
                  See the screens
                </a>
              </>
            )}
          </div>
          <p className="landing__note">
            Two fictional accounts, no sign-up, nothing real. Everything is synthetic data.
          </p>
        </div>

        <div className="landing__hero-art" aria-hidden="true">
          <div className="landing__orb" />
          <div className="landing__card landing__card--rings">
            <RingsPreview values={[0.86, 0.91, 0.72]} size={132} />
            <div className="landing__card-rows">
              <span><i style={{ background: 'var(--energy)' }} /> Move</span>
              <span><i style={{ background: 'var(--steps)' }} /> Steps</span>
              <span><i style={{ background: 'var(--hydration)' }} /> Water</span>
            </div>
          </div>
          <div className="landing__card landing__card--steps">
            <p className="landing__card-label">Steps · 7 days</p>
            <ColumnsPreview />
          </div>
          <div className="landing__card landing__card--heart">
            <p className="landing__card-label">Resting HR</p>
            <HeartPreview />
          </div>
        </div>
      </section>

      {signedIn && overview && (
        <section className="landing__stats" aria-label="Your current numbers">
          <Stat label="Day streak at goal" value={overview.streak} />
          <Stat label="Steps, 30 days" value={compact(overview.totalSteps)} />
          <Stat label="Weekly average" value={num(overview.weeklyAverageSteps)} unit="steps" />
          <Stat label="Sleep average" value={duration(overview.weeklySleepAverage)} />
        </section>
      )}

      <section className="landing__sections" id="sections">
        <h2 className="landing__h2">Five screens, linked from here</h2>
        <p className="landing__sub">
          Each one reads from the API and writes back to it. {signedIn ? 'Open any of them.' : 'Sign in to open them.'}
        </p>
        <div className="landing__grid">
          {SECTIONS.map(({ to, eyebrow, title, body, Preview, accent }) => (
            <Link className="landing__tile" to={signedIn ? to : '/login'} key={to}>
              <div className="landing__tile-art">
                <Preview />
              </div>
              <p className="landing__tile-eyebrow" style={{ color: accent }}>
                {eyebrow}
              </p>
              <h3 className="landing__tile-title">{title}</h3>
              <p className="landing__tile-body">{body}</p>
              <span className="landing__tile-go">
                {signedIn ? 'Open' : 'Sign in to open'} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing__how" id="how">
        <h2 className="landing__h2">How the demo is put together</h2>
        <div className="landing__how-grid">
          <article>
            <h3>React front end</h3>
            <p>
              Vite, plain JavaScript, hand-rolled SVG charts with no charting dependency. One set of
              screens adapts from a 320px phone to a desktop sidebar.
            </p>
          </article>
          <article>
            <h3>Express API</h3>
            <p>
              REST endpoints for days, meals, workouts, water, goals and preferences, with
              scrypt-hashed passwords and a signed httpOnly session cookie.
            </p>
          </article>
          <article>
            <h3>SQLite database</h3>
            <p>
              Users, days, sleep, meals, workouts and samples in real tables. The seed script writes
              ninety days per account; after that the database is the source of truth.
            </p>
          </article>
          <article>
            <h3>Derived, not hard-coded</h3>
            <p>
              Insights and the streak above are computed from the stored rows on each request, so
              they change as soon as you log something.
            </p>
          </article>
        </div>
      </section>

      <footer className="landing__footer">
        <p>
          Pulse is a demo application. It is not a medical device, it gives no medical advice, and
          every account and reading in it is fictional.
        </p>
        {!signedIn && (
          <Link className="btn btn--primary" to="/login">
            Try a demo account
          </Link>
        )}
      </footer>
    </div>
  );
}
