"use client";

import { useEffect, useRef, useState } from "react";

// Shows a formatted figure ("$42,000", "24", "67%") and counts it up from zero the first time it scrolls into view.
// Server render and no-JS show the final value; reduced-motion users never see the count.
export function AnimatedValue({ value, ms = 1100 }: { value: string; ms?: number }) {
  const m = value.match(/^([^0-9-]*)(-?\d[\d,]*(?:\.\d+)?)([\s\S]*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  const target = m ? Number(m[2].replace(/,/g, "")) : 0;
  const decimals = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!m || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / ms);
        if (k < 1) {
          setShown(target * (1 - Math.pow(1 - k, 3)));
          raf = requestAnimationFrame(tick);
        } else setShown(null);
      };
      setShown(0);
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!m) return <span ref={ref}>{value}</span>;
  const n = shown == null ? m[2] : decimals ? shown.toFixed(decimals) : Math.round(shown).toLocaleString("en-CA");
  return (
    <span ref={ref}>
      {m[1]}
      {n}
      {m[3]}
    </span>
  );
}
