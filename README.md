# Pulse — health tracker interface

A front-end-only demo of a cross-platform health tracking app, built with React
and plain JavaScript. It has no back end, no network calls and no real data:
ninety days of history are generated on device from a fixed seed, and anything
you log during the demo is kept in `localStorage` only.

> Demo interface. Not a medical device, and nothing in it is medical advice.

## Running it

```bash
npm install
npm run dev     # http://localhost:5173
```

`npm run build` produces a static bundle in `dist/`; `npm run preview` serves it.
The dev server binds to `0.0.0.0`, so you can open it from a phone on the same
network to try the touch layout on real hardware.

## What "cross-platform" means here

One codebase, one set of screens, two navigation shapes:

| | Phone / tablet (< 900px) | Desktop (>= 900px) |
|---|---|---|
| Navigation | fixed bottom tab bar | persistent sidebar |
| Cards | single column | two-column grids |
| Logging | bottom sheet | centred dialog |

Everything else adapts by itself. Specifically:

- **Touch first.** Every interactive target is at least 44px; nothing is
  hover-only — charts respond to `pointerdown` as well as `pointermove`, so
  tooltips work on a touchscreen.
- **Safe areas.** The shell pads with `env(safe-area-inset-*)`, so it sits
  correctly under a notch and above a home indicator when installed to a home
  screen. `manifest.webmanifest` plus `theme-color` make it installable.
- **Real viewport units.** `100dvh` rather than `100vh`, so a mobile browser's
  collapsing toolbar doesn't clip the layout.
- **No horizontal scroll at 320px**, verified on every screen.
- **Light and dark are both authored**, each as its own selected palette, and
  follow the OS unless the in-app toggle overrides them.
- **Inputs are 16px**, which stops iOS Safari zooming on focus.
- **`prefers-reduced-motion`** disables the ring and sheet animations.

The structure is deliberately portable: screens are composed from primitives
(`Card`, `StatTile`, `Meter`, `Sheet`) and the charts are hand-rolled SVG with
no charting dependency, so porting to React Native means swapping the primitive
layer and `react-native-svg`, not rewriting the screens.

## Screens

- **Today** — steps hero, three activity rings (move / steps / hydration),
  stat tiles with sparklines, hydration quick-add, today's workouts, food diary,
  insights.
- **Activity** — 7 / 30 / 90-day ranges, steps column chart against the goal
  line, resting heart rate, today's intraday heart rate, workout history.
- **Food** — calorie budget meter, macro targets, a week of stacked macros, the
  day's diary grouped by meal.
- **Sleep** — last night's hero, weekly stage breakdown (deep / REM / light /
  awake), efficiency and bedtime stats, nightly detail.
- **Profile** — weight trend, editable daily goals, appearance and unit
  preferences, simulated connected devices, reset.

## Interactions that actually work

Logging water, food and workouts updates the rings, meters and charts
immediately and survives a reload. Goals are editable and every screen reacts.
Units switch between metric and imperial at render time — nothing is stored in
imperial. The theme toggle and the table-view preference persist too.

## Charts

The charts follow a small set of rules rather than taste:

- **Three hues maximum in any one colour-coded set.** Move / steps / hydration
  use categorical slots that were validated for colour-vision separation
  against both the light and dark surfaces; a fourth hue in that set fails, so
  there isn't one.
- **Sleep stages are ordered, not categorical**, so they use steps of a single
  blue ramp (deepest = darkest) with neutral gray for time awake.
- **Status colours are reserved.** The calorie budget meter uses good / warning
  / critical and never borrows a series colour, and it always ships with a text
  label beside the colour.
- **Identity never rests on colour alone.** Two or more series always get a
  legend, every chart has a table view (toggle per card, or on globally in
  Profile), and every chart carries an `aria-label` describing its data.
- Marks are thin, bars cap at 24px with a 4px rounded data end, stacked
  segments are separated by a 2px gap in the surface colour, labels are
  selective (the extreme and the latest, not every point), and axis ticks thin
  themselves to whatever the available width can hold.

## Layout of the code

```
src/
  components/    primitives (Card, Sheet, Meter, StatTile, Segmented, …)
                 and charts (ColumnChart, LineChart, StackedBarChart,
                 ActivityRings, Sparkline) — all hand-rolled SVG
  screens/       Today, Activity, Nutrition, Sleep, Profile
  store/         React context + reducer, mirrored into localStorage
  data/          seeded generator for the 90-day demo history
  lib/           formatting/units, chart geometry, container measurement
  styles/        design tokens and layout
```

Routing is the URL hash, so the browser and Android back gestures move between
tabs the way a tab bar is expected to behave.
