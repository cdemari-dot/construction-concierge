"use client";

import { PPE_ITEMS, PPE_EMOJI } from "@/lib/kiosk/constants";

export function PpeStep({
  checked,
  onToggle,
  onAllGood,
  onMissing,
}: {
  checked: Record<number, boolean>;
  onToggle: (i: number) => void;
  onAllGood: () => void;
  onMissing: () => void;
}) {
  const all = PPE_ITEMS.every((_, i) => checked[i]);

  return (
    <div>
      <div className="display fa-title">🦺 Got your gear on?</div>
      <div className="fa-help">Tap each one to check it off.</div>
      <div style={{ display: "grid", gap: 8, marginBottom: 4 }}>
        {PPE_ITEMS.map((p, i) => (
          <button
            key={p}
            type="button"
            onClick={() => onToggle(i)}
            className="cc-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textAlign: "left",
              fontSize: 17,
              fontWeight: 600,
              minHeight: 60,
              borderColor: checked[i] ? "rgba(63,191,127,.6)" : undefined,
              background: checked[i] ? "rgba(63,191,127,.14)" : undefined,
              color: "var(--text)",
            }}
          >
            <span style={{ fontSize: 28 }}>{PPE_EMOJI[i] ?? "🔹"}</span>
            <span style={{ flex: 1 }}>{p}</span>
            <span style={{ fontSize: 26 }}>{checked[i] ? "✅" : "⬜"}</span>
          </button>
        ))}
      </div>
      <button className="fa-btn go" disabled={!all} onClick={onAllGood} type="button">
        👍 Yes, all geared up
      </button>
      <button className="fa-btn quiet" onClick={onMissing} type="button">
        🙋 I&apos;m missing something
      </button>
    </div>
  );
}
