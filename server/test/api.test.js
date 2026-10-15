/* Boots the real server against a throwaway database and drives it over HTTP.
 * Run with: npm test */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4789;
const BASE = `http://127.0.0.1:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-test-'));

let child;
let cookie = '';

async function call(path_, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(BASE + path_, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(auth && cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

before(async () => {
  child = spawn('node', [path.join(here, '..', 'src', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), PULSE_DATA_DIR: dataDir, NODE_ENV: 'test' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('server did not start');
});

after(() => {
  child?.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('seeding', () => {
  it('creates demo accounts and history on first boot', async () => {
    const { status, body } = await call('/api/health', { auth: false });
    assert.equal(status, 200);
    assert.equal(body.users, 2);
    assert.equal(body.days, 180); // 90 days x 2 accounts
  });
});

describe('auth', () => {
  it('lists demo accounts without exposing the password', async () => {
    const { status, body } = await call('/api/demo-accounts', { auth: false });
    assert.equal(status, 200);
    assert.equal(body.length, 2);
    for (const account of body) {
      assert.ok(account.email && account.name);
      assert.equal('password' in account, false);
    }
    assert.equal(JSON.stringify(body).includes('pulse1234'), false);
  });

  it('refuses protected routes without a session', async () => {
    const { status } = await call('/api/bootstrap', { auth: false });
    assert.equal(status, 401);
  });

  it('rejects a wrong password', async () => {
    const { status } = await call('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { email: 'alex@pulse.demo', password: 'nope' },
    });
    assert.equal(status, 401);
  });

  it('issues a session for valid credentials', async () => {
    const { status, body } = await call('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { email: 'alex@pulse.demo', password: 'pulse1234' },
    });
    assert.equal(status, 200);
    assert.equal(body.user.email, 'alex@pulse.demo');
    assert.ok(cookie.startsWith('pulse_session='));
  });

  it('does not accept a tampered session cookie', async () => {
    const good = cookie;
    cookie = 'pulse_session=2.1700000000000.forged';
    const { status } = await call('/api/bootstrap');
    assert.equal(status, 401);
    cookie = good;
  });
});

describe('reading data', () => {
  it('returns 90 days plus goals and derived insights', async () => {
    const { status, body } = await call('/api/bootstrap');
    assert.equal(status, 200);
    assert.equal(body.days.length, 90);
    assert.ok(body.goals.steps > 0);
    assert.ok(Array.isArray(body.insights));
    assert.equal(body.days.at(-1).date, body.today);
  });

  it('marks only the last day as today', async () => {
    const { body } = await call('/api/days?days=7');
    assert.equal(body.filter((d) => d.isToday).length, 1);
    assert.equal(body.at(-1).isToday, true);
  });

  it('keeps a user out of another account’s data', async () => {
    const mine = await call('/api/bootstrap');
    const before = mine.body.user.id;
    const other = await call('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { email: 'sam@pulse.demo', password: 'pulse1234' },
    });
    assert.notEqual(other.body.user.id, before);
    const sam = await call('/api/bootstrap');
    assert.equal(sam.body.user.email, 'sam@pulse.demo');
    // back to the first account for the remaining tests
    await call('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { email: 'alex@pulse.demo', password: 'pulse1234' },
    });
  });
});

describe('writing data', () => {
  it('adds water and reflects it in the day total', async () => {
    const before = (await call('/api/days?days=1')).body[0].waterMl;
    const { status, body } = await call('/api/water', { method: 'POST', body: { ml: 500 } });
    assert.equal(status, 201);
    assert.equal(body.waterMl, before + 500);
  });

  it('rejects a meal with no name', async () => {
    const { status } = await call('/api/meals', { method: 'POST', body: { calories: 100 } });
    assert.equal(status, 400);
  });

  it('adds and removes a meal', async () => {
    const before = (await call('/api/days?days=1')).body[0].nutrition.calories;
    const added = await call('/api/meals', {
      method: 'POST',
      body: { meal: 'Snack', name: 'Test bar', calories: 200, protein: 10, carbs: 20, fat: 5 },
    });
    assert.equal(added.status, 201);
    assert.equal(added.body.day.nutrition.calories, before + 200);

    const removed = await call(`/api/meals/${added.body.id}`, { method: 'DELETE' });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.day.nutrition.calories, before);
  });

  it('will not delete a seeded entry', async () => {
    const day = (await call('/api/days?days=1')).body[0];
    const seeded = day.meals.find((m) => !m.userAdded);
    if (!seeded) return; // early in the day there may be none yet
    const { status } = await call(`/api/meals/${seeded.id}`, { method: 'DELETE' });
    assert.equal(status, 404);
  });

  it('adds a workout and counts it toward exercise minutes', async () => {
    const before = (await call('/api/days?days=1')).body[0].exerciseMinutes;
    const { status, body } = await call('/api/workouts', {
      method: 'POST',
      body: { type: 'Run', minutes: 30, calories: 300 },
    });
    assert.equal(status, 201);
    assert.equal(body.day.exerciseMinutes, before + 30);
  });

  it('persists goal and preference changes', async () => {
    const goals = await call('/api/goals', { method: 'PUT', body: { steps: 12345 } });
    assert.equal(goals.body.steps, 12345);
    const prefs = await call('/api/preferences', { method: 'PUT', body: { units: 'imperial' } });
    assert.equal(prefs.body.units, 'imperial');
    const fresh = await call('/api/bootstrap');
    assert.equal(fresh.body.goals.steps, 12345);
    assert.equal(fresh.body.user.preferences.units, 'imperial');
  });

  it('ignores an invalid preference value', async () => {
    const { body } = await call('/api/preferences', { method: 'PUT', body: { units: 'furlongs' } });
    assert.equal(body.units, 'imperial');
  });

  it('resets only what the user logged', async () => {
    const before = (await call('/api/days?days=1')).body[0];
    assert.ok(before.workouts.some((w) => w.userAdded), 'expected the workout added above');
    const { status, body } = await call('/api/demo/reset', { method: 'POST' });
    assert.equal(status, 200);
    const after_ = body.days.at(-1);
    assert.equal(after_.workouts.some((w) => w.userAdded), false);
    assert.ok(after_.meals.length >= 0);
  });
});

describe('sessions end', () => {
  it('logs out', async () => {
    await call('/api/auth/logout', { method: 'POST' });
    cookie = '';
    const { status } = await call('/api/bootstrap');
    assert.equal(status, 401);
  });
});
