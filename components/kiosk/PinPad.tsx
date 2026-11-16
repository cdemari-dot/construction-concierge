"use client";

import { Icon } from "@/components/field/Icon";

export function PinPad({
  pin,
  onDigit,
  onClear,
  onBackspace,
  message,
  error,
}: {
  pin: string;
  onDigit: (n: number) => void;
  onClear: () => void;
  onBackspace: () => void;
  message?: string;
  error?: string | null;
}) {
  const key: React.CSSProperties = { height: 72, fontSize: 28, fontWeight: 600, borderRadius: 18 };
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "grid", placeItems: "center", color: "var(--cyan)" }}>
        <Icon name="clock" size={44} />
      </div>
      <div className="display" style={{ fontSize: 28, margin: "4px 0 4px" }}>
        Clock in or out
      </div>
      <div style={{ color: error ? "var(--red)" : "var(--mute)", minHeight: 24, fontSize: 15 }}>
        {error ?? (message || "Type your 4-digit PIN")}
      </div>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", margin: "16px 0 20px" }}>
        {[0, 1, 2, 3].map((i) => (
          <i
            key={i}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              display: "inline-block",
              border: "2px solid var(--line2)",
              background: i < pin.length ? "var(--cyan)" : "transparent",
              boxShadow: i < pin.length ? "0 0 10px var(--cyan)" : "none",
            }}
          />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, maxWidth: 330, margin: "0 auto" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} className="cc-btn ghost" style={key} onClick={() => onDigit(n)} type="button">
            {n}
          </button>
        ))}
        <button className="cc-btn ghost" style={{ ...key, fontSize: 16 }} onClick={onClear} type="button">
          Clear
        </button>
        <button className="cc-btn ghost" style={key} onClick={() => onDigit(0)} type="button">
          0
        </button>
        <button className="cc-btn ghost" style={key} onClick={onBackspace} type="button" aria-label="Backspace">
          ⌫
        </button>
      </div>
    </div>
  );
}
