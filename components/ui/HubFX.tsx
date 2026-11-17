"use client";

import { useEffect } from "react";

// Motion for the owner and crew apps, matching the website: cards and rows rise in as they scroll into view
// (also for content that loads in later), numbers count up elsewhere. Nothing is hidden until JS is running,
// and visitors who prefer reduced motion get no movement at all.
export function HubFX() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".hub");
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const SEL = ".cc-card, .cc-in, .fx";
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.06, rootMargin: "0px 0px -3% 0px" },
    );
    const track = (el: Element) => {
      if (seen.has(el)) return;
      seen.add(el);
      // Already on screen at start: reveal at once (no hide-then-show flicker).
      if (el.getBoundingClientRect().top < window.innerHeight * 0.97) el.classList.add("in");
      else io.observe(el);
    };
    const scan = (n: ParentNode) => n.querySelectorAll(SEL).forEach(track);

    scan(root);
    root.classList.add("fx-on");

    const mo = new MutationObserver((muts) =>
      muts.forEach((m) =>
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          const el = n as Element;
          if (el.matches(SEL)) track(el);
          scan(el);
        }),
      ),
    );
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove("fx-on");
    };
  }, []);
  return null;
}
