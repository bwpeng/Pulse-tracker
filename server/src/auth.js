/* Demo auth: scrypt-hashed passwords and a signed, httpOnly session cookie.
 * Real enough to be functional; the accounts themselves are fictional. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './db.js';

const COOKIE = 'pulse_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** Persist a secret so sessions survive a restart; never commit it. */
function loadSecret() {
  if (process.env.PULSE_SECRET) return process.env.PULSE_SECRET;
  const file = path.join(DATA_DIR, '.secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}

const SECRET = loadSecret();

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, expected] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

export function issueSession(res, userId) {
  const payload = `${userId}.${Date.now()}`;
  const token = `${payload}.${sign(payload)}`;
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.PULSE_INSECURE_COOKIE !== '1',
    maxAge: MAX_AGE_SEC * 1000,
    path: '/',
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

/** Returns the user id carried by a valid, unexpired cookie, else null. */
export function sessionUserId(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [id, issued, mac] = parts;
  const payload = `${id}.${issued}`;
  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Date.now() - Number(issued) > MAX_AGE_SEC * 1000) return null;
  return Number(id);
}

/** Express middleware: 401s anything without a valid session. */
export function requireAuth(req, res, next) {
  const userId = sessionUserId(req);
  if (!userId) return res.status(401).json({ error: 'not_authenticated' });
  req.userId = userId;
  return next();
}
