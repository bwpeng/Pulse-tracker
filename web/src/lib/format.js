/** Formatting + unit helpers. All display-layer only — no data is ever stored
 *  in imperial; conversion happens at render time. */

export const KG_TO_LB = 2.20462;
export const KM_TO_MI = 0.621371;
export const ML_TO_FLOZ = 0.033814;

/** 1,284 · 12.9K · 1.4M — proportional figures, so keep it short. */
export function compact(n) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${round(n / 1_000_000, 1)}M`;
  if (abs >= 10_000) return `${round(n / 1000, 1)}K`;
  return Math.round(n).toLocaleString('en-US');
}

export function round(n, digits = 0) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function num(n, digits = 0) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function weight(kg, units) {
  return units === 'imperial'
    ? { value: num(kg * KG_TO_LB, 1), unit: 'lb' }
    : { value: num(kg, 1), unit: 'kg' };
}

export function distance(km, units) {
  return units === 'imperial'
    ? { value: num(km * KM_TO_MI, 2), unit: 'mi' }
    : { value: num(km, 2), unit: 'km' };
}

export function volume(ml, units) {
  return units === 'imperial'
    ? { value: num(ml * ML_TO_FLOZ, 0), unit: 'fl oz' }
    : { value: num(ml / 1000, 2), unit: 'L' };
}

export function height(cm, units) {
  if (units !== 'imperial') return { value: num(cm, 0), unit: 'cm' };
  const inches = cm / 2.54;
  return { value: `${Math.floor(inches / 12)}′ ${Math.round(inches % 12)}″`, unit: '' };
}

export function duration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function clockFromMinutes(minutes) {
  const total = ((minutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = Math.round(total % 60);
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

const DAY_MS = 86_400_000;

export function isoDay(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function addDays(iso, delta) {
  return isoDay(new Date(`${iso}T12:00:00`).getTime() + delta * DAY_MS);
}

export function shortDay(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' });
}

export function weekday(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

export function longDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function shortDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function pct(value, goal) {
  if (!goal) return 0;
  return Math.max(0, value / goal);
}
