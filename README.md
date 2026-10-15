# Pulse — health tracker demo

A cross-platform health tracker, built as a working application rather than a
mockup: a React front end, an Express API, and a SQLite database with session
auth and ninety days of history per account. Sign in with a demo account and
every number on every screen comes out of the database — log a glass of water
and the ring moves, the row is written, and it is still there after a reload.

> Demo application. Not a medical device, no medical advice, and every account
> and reading in it is fictional.

```
browser ──► React (Vite)  ──fetch──►  Express API  ──►  SQLite
             5 screens + landing      session cookie     users · days · sleep
             hand-rolled SVG charts   scrypt passwords   meals · workouts · samples
```

## Running it

```bash
npm install          # installs both workspaces
npm run dev          # API on :4000, front end on :5173 (proxied)
```

Open http://localhost:5173 and sign in with either demo account:

| Account | Email | Password |
|---|---|---|
| Alex Rivera | `alex@pulse.demo` | `pulse1234` |
| Sam Okafor | `sam@pulse.demo` | `pulse1234` |

The database seeds itself on first boot. Other scripts:

```bash
npm run build        # build the front end
npm start            # build, then serve API + front end together on :4000
npm test             # API test suite (boots a server against a temp database)
npm run seed         # re-seed from scratch (destructive: npm run seed -- --force)
```

## What it does

**Landing page** — the public entry point, linking to each screen with a preview
of the kind of chart that screen is made of. Shows your live streak and totals
once you are signed in.

**Today** — three activity rings (move, steps, hydration), stat tiles with
sparklines, hydration quick-add, the day's workouts and food diary, and insights
the API computes from your stored history.

**Activity** — 7 / 30 / 90-day ranges, daily steps against the goal line, resting
heart rate, today's intraday heart rate, and workout history.

**Food** — calorie budget meter, macro targets, a week of stacked macros, and the
day's diary grouped by meal. Quick-picks are drawn from what the account eats.

**Sleep** — stage breakdown (deep / REM / light / awake) for the last seven
nights, efficiency, bedtime drift, and nightly detail.

**Profile** — weight trend, editable goals, units, theme and table-view
preferences (stored on the account, not the browser), devices, reset and sign
out.

Everything you log is written through the API: water, meals, workouts, goals and
preferences all persist, and "today" is scaled to the share of the day elapsed,
so the rings show real progress rather than a finished day.

## API

All routes are under `/api`. Authentication is a signed, httpOnly session
cookie; passwords are scrypt-hashed. Everything below `/bootstrap` requires a
session.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | liveness plus row counts |
| `GET` | `/demo-accounts` | the demo logins shown on the sign-in screen |
| `POST` | `/auth/login` · `/auth/logout` | start and end a session |
| `GET` | `/auth/me` | current user, or 401 |
| `GET` | `/bootstrap` | everything the app needs in one call |
| `GET` | `/days?days=n` · `/days/:date` | history, with today partially elapsed |
| `GET` | `/overview` · `/insights` | derived figures, computed per request |
| `GET` | `/heart-rate/today` · `/devices` | intraday samples, paired devices |
| `POST` | `/water` · `/meals` · `/workouts` | log an entry |
| `DELETE` | `/meals/:id` · `/workouts/:id` | remove an entry you logged |
| `GET`/`PUT` | `/goals` · `/preferences` | read and update |
| `POST` | `/demo/reset` | drop everything this account logged by hand |

Seeded rows are marked as such, so a reset leaves the generated history intact
and the API refuses to delete seeded entries.

## Cross-platform handling

One codebase, one set of screens, two navigation shapes: a bottom tab bar below
900px, a persistent sidebar above it. Also:

- 44px minimum touch targets, and chart tooltips driven by `pointerdown` as well
  as `pointermove`, so they work on a touchscreen rather than hover only.
- `env(safe-area-inset-*)` padding and a web manifest, so it behaves installed to
  a home screen; `100dvh` so a collapsing mobile toolbar doesn't clip anything.
- Light and dark each authored as their own palette, following the OS unless the
  account's theme preference overrides it.
- 16px inputs (stops iOS Safari zooming on focus), `prefers-reduced-motion`
  support, and no horizontal scroll down to 320px.

## Charts

Hand-rolled SVG, no charting dependency:

- At most three hues in any one colour-coded set — the move / steps / hydration
  slots were validated for colour-vision separation against both the light and
  dark surfaces, and a fourth hue in that set fails, so there isn't one.
- Sleep stages are ordered rather than categorical, so they use steps of a single
  blue ramp with neutral gray for time awake.
- Status colours are reserved for meters and always ship with a text label.
- Identity never rests on colour alone: two or more series always get a legend,
  every chart has a table view, and every chart carries an `aria-label`.
- Axis ticks thin themselves to whatever the available width can hold.

## Layout

```
web/                     React front end (Vite)
  src/pages/             Landing, Login, Today, Activity, Nutrition, Sleep, Profile
  src/components/        primitives, charts, landing previews
  src/store/AppStore.jsx server-backed state with optimistic updates
  src/api/client.js      fetch wrapper
server/                  Express API
  src/db.js              SQLite schema
  src/service.js         all reads and writes, incl. the partial-day rule
  src/routes/api.js      REST endpoints
  src/auth.js            scrypt hashing, signed session cookie
  src/seed.js            demo accounts + 90 days each
  test/api.test.js       end-to-end API tests
```

The database file lives at `server/data/pulse.db` and is gitignored, as is the
session secret generated beside it.
