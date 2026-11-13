"use client";

import { useState } from "react";

export function GenerateCsvButton({ periodStart, periodEnd }: { periodStart: string; periodEnd: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/payroll-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodStart, periodEnd }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Export failed" }));
      setError(body.error ?? "Export failed");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${periodStart}-to-${periodEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <button className="cc-btn lime" disabled={busy} onClick={generate} type="button">
        {busy ? "Generating…" : "Generate & download CSV"}
      </button>
      {error && <div style={{ color: "var(--red)", fontSize: 12.5, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
