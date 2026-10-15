/* SQLite schema + connection. One file, created on first run; the seed script
 * fills it. Everything the app shows comes from these tables. */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.PULSE_DATA_DIR ?? path.join(here, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'pulse.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  initials        TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  age             INTEGER NOT NULL,
  height_cm       REAL NOT NULL,
  start_weight_kg REAL NOT NULL,
  target_weight_kg REAL NOT NULL,
  tagline         TEXT NOT NULL DEFAULT '',
  units           TEXT NOT NULL DEFAULT 'metric',
  theme           TEXT NOT NULL DEFAULT 'system',
  show_tables     INTEGER NOT NULL DEFAULT 0,
  reminders       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goals (
  user_id          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  steps            INTEGER NOT NULL,
  active_calories  INTEGER NOT NULL,
  exercise_minutes INTEGER NOT NULL,
  water_ml         INTEGER NOT NULL,
  sleep_minutes    INTEGER NOT NULL,
  calories         INTEGER NOT NULL,
  protein          INTEGER NOT NULL,
  carbs            INTEGER NOT NULL,
  fat              INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS days (
  id               INTEGER PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date             TEXT NOT NULL,
  steps            INTEGER NOT NULL,
  distance_km      REAL NOT NULL,
  active_calories  INTEGER NOT NULL,
  exercise_minutes INTEGER NOT NULL,
  stand_hours      INTEGER NOT NULL,
  resting_hr       INTEGER NOT NULL,
  hrv              INTEGER NOT NULL,
  weight_kg        REAL NOT NULL,
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS sleep (
  id              INTEGER PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,
  asleep_minutes  INTEGER NOT NULL,
  deep            INTEGER NOT NULL,
  rem             INTEGER NOT NULL,
  light           INTEGER NOT NULL,
  awake           INTEGER NOT NULL,
  bedtime_minutes INTEGER NOT NULL,
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS water_logs (
  id      INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date    TEXT NOT NULL,
  ml      INTEGER NOT NULL,
  source  TEXT NOT NULL DEFAULT 'user',
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meals (
  id       INTEGER PRIMARY KEY,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date     TEXT NOT NULL,
  meal     TEXT NOT NULL,
  name     TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein  INTEGER NOT NULL,
  carbs    INTEGER NOT NULL,
  fat      INTEGER NOT NULL,
  logged_at_minutes INTEGER NOT NULL,
  source   TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS workouts (
  id       INTEGER PRIMARY KEY,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date     TEXT NOT NULL,
  type     TEXT NOT NULL,
  icon     TEXT NOT NULL,
  minutes  INTEGER NOT NULL,
  calories INTEGER NOT NULL,
  distance_km REAL NOT NULL DEFAULT 0,
  avg_hr   INTEGER NOT NULL,
  start_minutes INTEGER NOT NULL,
  source   TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS hr_samples (
  id      INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date    TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  bpm     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id      INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  detail  TEXT NOT NULL,
  icon    TEXT NOT NULL,
  linked  INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_days_user_date     ON days (user_id, date);
CREATE INDEX IF NOT EXISTS idx_sleep_user_date    ON sleep (user_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_user_date    ON meals (user_id, date);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts (user_id, date);
CREATE INDEX IF NOT EXISTS idx_water_user_date    ON water_logs (user_id, date);
CREATE INDEX IF NOT EXISTS idx_hr_user_date       ON hr_samples (user_id, date);
`);

export function isSeeded() {
  return db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0;
}
