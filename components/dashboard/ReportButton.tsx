"use client";

import { useState, useTransition } from "react";

// Runs a server action, shows its error instead of swallowing it.
export function ReportButton({ label, run, ghost }: { label: string; run: () => Promise<void>; ghost?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span>
      <button
        type="button"
        className={`cc-btn sm ${ghost ? "ghost" : ""}`}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              await run();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed");
            }
          })
        }
      >
        {pending ? "…" : label}
      </button>
      {error && <span style={{ color: "var(--red)", fontSize: 12, marginLeft: 8 }}>{error}</span>}
    </span>
  );
}
