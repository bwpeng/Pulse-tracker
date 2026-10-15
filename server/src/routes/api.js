import { Router } from 'express';
import { db } from '../db.js';
import {
  clearSession,
  issueSession,
  requireAuth,
  sessionUserId,
  verifyPassword,
} from '../auth.js';
import { demoAccounts } from '../seed.js';
import * as svc from '../service.js';

export const api = Router();

/** Tiny in-memory throttle so the demo login can't be hammered. */
const attempts = new Map();
function throttle(key, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const entry = attempts.get(key)?.filter((t) => now - t < windowMs) ?? [];
  entry.push(now);
  attempts.set(key, entry);
  return entry.length > limit;
}

const wrap = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res)).catch(next);

api.get('/health', (_req, res) => {
  const counts = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM users) AS users,
              (SELECT COUNT(*) FROM days) AS days,
              (SELECT COUNT(*) FROM meals) AS meals`
    )
    .get();
  res.json({ ok: true, ...counts });
});

/* ---------------------------------------------------------------- auth ---- */

api.get('/demo-accounts', (_req, res) => res.json(demoAccounts));

api.post(
  '/auth/login',
  wrap((req, res) => {
    if (throttle(req.ip)) return res.status(429).json({ error: 'too_many_attempts' });
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const row = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email);
    if (!row || !verifyPassword(password, row.password_hash)) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    issueSession(res, row.id);
    return res.json({ user: svc.getUser(row.id) });
  })
);

api.post('/auth/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

api.get('/auth/me', (req, res) => {
  const userId = sessionUserId(req);
  if (!userId) return res.status(401).json({ error: 'not_authenticated' });
  const user = svc.getUser(userId);
  if (!user) return res.status(401).json({ error: 'not_authenticated' });
  return res.json({ user });
});

/* ----------------------------------------------------------- app data ---- */

api.use(requireAuth);

api.get(
  '/bootstrap',
  wrap((req, res) =>
    res.json({
      user: svc.getUser(req.userId),
      goals: svc.getGoals(req.userId),
      days: svc.getDays(req.userId, { days: 90 }),
      heartRate: svc.getHeartRateToday(req.userId),
      devices: svc.getDevices(req.userId),
      insights: svc.getInsights(req.userId),
      overview: svc.getOverview(req.userId),
      catalog: {
        foods: svc.getFoodCatalog(req.userId),
        workouts: svc.getWorkoutCatalog(req.userId),
      },
      today: svc.today(),
    })
  )
);

api.get('/days', wrap((req, res) => res.json(svc.getDays(req.userId, { days: req.query.days }))));

api.get(
  '/days/:date',
  wrap((req, res) => {
    const day = svc.getDay(req.userId, req.params.date);
    return day ? res.json(day) : res.status(404).json({ error: 'not_found' });
  })
);

api.get('/overview', wrap((req, res) => res.json(svc.getOverview(req.userId))));
api.get('/insights', wrap((req, res) => res.json(svc.getInsights(req.userId))));
api.get('/heart-rate/today', wrap((req, res) => res.json(svc.getHeartRateToday(req.userId))));
api.get('/devices', wrap((req, res) => res.json(svc.getDevices(req.userId))));

api.post('/water', wrap((req, res) => res.status(201).json(svc.addWater(req.userId, req.body ?? {}))));

api.post('/meals', wrap((req, res) => res.status(201).json(svc.addMeal(req.userId, req.body ?? {}))));

api.delete(
  '/meals/:id',
  wrap((req, res) =>
    svc.deleteMeal(req.userId, Number(req.params.id))
      ? res.json({ ok: true, day: svc.getDay(req.userId, req.query.date ?? svc.today()) })
      : res.status(404).json({ error: 'not_found' })
  )
);

api.post(
  '/workouts',
  wrap((req, res) => res.status(201).json(svc.addWorkout(req.userId, req.body ?? {})))
);

api.delete(
  '/workouts/:id',
  wrap((req, res) =>
    svc.deleteWorkout(req.userId, Number(req.params.id))
      ? res.json({ ok: true, day: svc.getDay(req.userId, req.query.date ?? svc.today()) })
      : res.status(404).json({ error: 'not_found' })
  )
);

api.post(
  '/demo/reset',
  wrap((req, res) => {
    const result = svc.resetUserEntries(req.userId);
    return res.json({ ...result, days: svc.getDays(req.userId, { days: 90 }) });
  })
);

api.get('/goals', wrap((req, res) => res.json(svc.getGoals(req.userId))));
api.put('/goals', wrap((req, res) => res.json(svc.updateGoals(req.userId, req.body ?? {}))));

api.get('/preferences', wrap((req, res) => res.json(svc.getUser(req.userId).preferences)));
api.put(
  '/preferences',
  wrap((req, res) => res.json(svc.updatePreferences(req.userId, req.body ?? {})))
);
