"use client";

import { useEffect, useState } from "react";
import { Odometer } from "@/components/ui/Odometer";

// Illustrative job-cost card for the hero: the counter ticks up like the real Jobs page does.
// All numbers are made-up example data and the card says so.
export function HeroTicker() {
  const base = 4860.12;
  const ratePerHour = 585;
  const [t0] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const cost = base + (ratePerHour * (now - t0)) / 3600000;
  const money = "$" + cost.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="hero-card" aria-label="Example job card with a live cost counter">
      <div className="hero-card-top">
        <div>
          <div className="hc-job">J-2026-114 · Unit 12 fit-out</div>
          <div className="hc-addr">Mississauga, ON</div>
        </div>
        <span className="hc-pill">9 on site</span>
      </div>
      <div className="hc-stats">
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
          <b className="amber">$18,500</b>
        </div>
        <div>
          <small>Margin</small>
          <b className="green">34%</b>
        </div>
      </div>
      <div className="hc-live">
        <small>
          <i /> Live job cost so far
        </small>
        <Odometer text={money} size={34} color="var(--lime)" />
        <div className="hc-sub">Labour and bills · 9 clocked in · +$585/hr</div>
      </div>
      <div className="hc-note">Example data</div>
    </div>
  );
}
