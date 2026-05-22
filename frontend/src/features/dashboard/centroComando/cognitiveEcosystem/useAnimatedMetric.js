import { useState, useEffect, useRef } from 'react';

export default function useAnimatedMetric(target, duration = 900) {
  const [display, setDisplay] = useState(target ?? 0);
  const prev = useRef(target ?? 0);

  useEffect(() => {
    if (target == null || Number.isNaN(target)) return;
    const from = prev.current;
    const to = typeof target === 'number' ? target : parseFloat(target) || 0;
    if (from === to) return;

    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) ** 3;
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}
