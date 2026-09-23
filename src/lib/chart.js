/** Shared chart geometry helpers. */

/** Bar with a 4px rounded data-end and square corners at the baseline. */
export function barPath(x, y, w, h, r = 4) {
  const radius = Math.max(0, Math.min(r, h, w / 2));
  if (h <= 0) return '';
  return [
    `M${x},${y + h}`,
    `L${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `L${x + w - radius},${y}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `L${x + w},${y + h}`,
    'Z',
  ].join(' ');
}

/** Clean axis ticks: 0 / 5,000 / 10,000 rather than 0 / 4,317 / 8,634. */
export function niceTicks(max, count = 3) {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const ticks = [];
  // Run past `max` so the top tick always covers the tallest mark — otherwise a
  // bar climbs out of its own plot area and collides with the card header.
  for (let v = 0; v < max - step * 0.001; v += step) ticks.push(Number(v.toFixed(6)));
  ticks.push(Number((Math.ceil(max / step) * step).toFixed(6)));
  return ticks;
}

export function scaleLinear(domainMax, rangePx) {
  return (value) => (domainMax > 0 ? (value / domainMax) * rangePx : 0);
}

/** Clamp a tooltip so it never hangs off the edge of a phone screen. */
export function clampTip(x, width, tipWidth = 130) {
  return Math.min(Math.max(x, tipWidth / 2 + 4), width - tipWidth / 2 - 4);
}
