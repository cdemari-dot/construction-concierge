"use client";

import { useEffect, useState } from "react";

// Counts from 0 to `value` on mount (skipped when the user prefers reduced motion).
export function CountUp({ value, decimals = 0, suffix = "", ms = 900 }: { value: number; decimals?: number; suffix?: string; ms?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const r = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(r);
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setShown(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return (
    <>
      {decimals === 0 ? Math.round(shown).toLocaleString("en-CA") : shown.toFixed(decimals)}
      {suffix}
    </>
  );
}
