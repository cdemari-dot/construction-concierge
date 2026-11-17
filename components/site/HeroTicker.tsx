"use client";

import { useEffect, useState } from "react";
import { Odometer } from "@/components/ui/Odometer";

// The hero "product": a job-cost card whose counter ticks up like the real Jobs page does.
// All numbers are made-up example data and the card says so.
export function HeroTicker({ compact = false }: { compact?: boolean }) {
  const base = 4860.12;
  const ratePerHour = 585;
  const [t0] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [size, setSize] = useState(compact ? 44 : 64);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    const fit = () => setSize(compact ? Math.max(32, Math.min(46, Math.round(window.innerWidth * 0.034))) : Math.max(34, Math.min(84, Math.round(window.innerWidth * 0.085))));
    fit();
    window.addEventListener("resize", fit);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", fit);
    };
  }, [compact]);
  const cost = base + (ratePerHour * (now - t0)) / 3600000;
  const money = "$" + cost.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className={`showcase${compact ? " compact" : ""}`} aria-label="Example job card with a live cost counter">
      <div className="sc-glow" aria-hidden="true" />
      <div className="sc-head">
        <div>
          <span className="sc-live">
            <i /> Live job cost
          </span>
          <div className="sc-job">J-2026-114 · Unit 12 fit-out · Mississauga, ON</div>
        </div>
        <span className="sc-pill">9 on site</span>
      </div>
      <div className="sc-num">
        <Odometer text={money} size={size} color="#ffffff" />
      </div>
      <div className="sc-sub">Labour and bills so far · 9 clocked in · +$585/hr</div>
      <div className="sc-stats">
        <div>
          <small>Contract</small>
          <b>$42,000</b>
        </div>
        <div>
          <small>Billed</small>
          <b>$18,500</b>
        </div>
        <div>
          <small>Owing</small>
          <b>$18,500</b>
        </div>
        <div>
          <small>Margin</small>
          <b className="g">34%</b>
        </div>
      </div>
      <div className="sc-note">Example data</div>
    </div>
  );
}
