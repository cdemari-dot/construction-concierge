"use client";

import { PPE_ITEMS } from "@/lib/kiosk/constants";

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
      <div style={{ fontSize: 12, letterSpacing: 2, color: "var(--mute)" }}>STEP 1 OF 2 · BEFORE YOU START</div>
      <div className="display" style={{ fontSize: 24, margin: "8px 0 16px" }}>
        Do you have all your required PPE?
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
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
              fontSize: 15,
              borderColor: checked[i] ? "rgba(63,191,127,.55)" : undefined,
              background: checked[i] ? "rgba(63,191,127,.1)" : undefined,
            }}
          >
            <span style={{ fontSize: 20 }}>{checked[i] ? "✅" : "⬜"}</span>
            {p}
          </button>
        ))}
      </div>
      <button className="cc-btn lime" style={{ width: "100%", padding: 16, opacity: all ? 1 : 0.35 }} disabled={!all} onClick={onAllGood} type="button">
        Yes, all PPE on
      </button>
      <button className="cc-btn ghost" style={{ width: "100%", padding: 14, marginTop: 8 }} onClick={onMissing} type="button">
        No, I&apos;m missing something
      </button>
    </div>
  );
}
