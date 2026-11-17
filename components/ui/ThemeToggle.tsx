"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

function effectiveTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  if (document.querySelector(".hub")) return "light";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function subscribe(cb: () => void) {
  window.addEventListener("cc-theme", cb);
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", cb);
  return () => {
    window.removeEventListener("cc-theme", cb);
    mq.removeEventListener("change", cb);
  };
}

export function ThemeToggle({ style }: { style?: React.CSSProperties }) {
  const theme = useSyncExternalStore(subscribe, effectiveTheme, () => "dark" as Theme);

  function flip() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("cc-theme", next);
    } catch {}
    window.dispatchEvent(new Event("cc-theme"));
  }

  return (
    <button className="cc-btn ghost" onClick={flip} type="button" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} style={style}>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
