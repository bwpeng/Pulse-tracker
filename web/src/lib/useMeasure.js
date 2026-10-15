import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Charts are drawn at the real pixel width of their container rather than
 *  being scaled with preserveAspectRatio, so text and stroke weights stay
 *  true on every screen size. */
export default function useMeasure(fallback = 320) {
  const [width, setWidth] = useState(fallback);
  const node = useRef(null);

  const ref = useCallback((el) => {
    node.current = el;
    if (el) setWidth(el.clientWidth || fallback);
  }, [fallback]);

  // Measure before the browser paints, so the first frame is already the right
  // size rather than a fallback width that a ResizeObserver corrects later.
  useLayoutEffect(() => {
    const el = node.current;
    if (el?.clientWidth) setWidth(el.clientWidth);
  });

  useEffect(() => {
    const el = node.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect?.width;
      if (next) setWidth(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, Math.max(200, Math.round(width))];
}
