"use client";

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
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: "var(--mute)" }}>CLOCK IN · CLOCK OUT</div>
      <div className="display" style={{ fontSize: 28, margin: "8px 0 6px" }}>
        Enter your PIN
      </div>
      <div style={{ color: error ? "var(--red)" : "var(--mute)", minHeight: 22, fontSize: 14 }}>
        {error || message || "4 digits"}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", margin: "16px 0 20px" }}>
        {[0, 1, 2, 3].map((i) => (
          <i
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              display: "inline-block",
              border: "2px solid var(--line2)",
              background: i < pin.length ? "var(--cyan)" : "transparent",
              boxShadow: i < pin.length ? "0 0 10px var(--cyan)" : "none",
            }}
          />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, maxWidth: 300, margin: "0 auto" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} className="cc-btn ghost" style={{ height: 64, fontSize: 24 }} onClick={() => onDigit(n)} type="button">
            {n}
          </button>
        ))}
        <button className="cc-btn ghost" style={{ height: 64, fontSize: 14 }} onClick={onClear} type="button">
          Clear
        </button>
        <button className="cc-btn ghost" style={{ height: 64, fontSize: 24 }} onClick={() => onDigit(0)} type="button">
          0
        </button>
        <button className="cc-btn ghost" style={{ height: 64, fontSize: 18 }} onClick={onBackspace} type="button">
          ⌫
        </button>
      </div>
    </div>
  );
}
