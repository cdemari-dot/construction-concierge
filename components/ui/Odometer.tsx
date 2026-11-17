"use client";

// Rolling-digit counter: each digit is a vertical strip 0-9 that slides to its number,
// so the value visibly ticks up like an odometer. Pass an already-formatted string like "$1,234.56".
export function Odometer({ text, size = 30, color = "var(--lime)" }: { text: string; size?: number; color?: string }) {
  const h = size * 1.15;
  return (
    <span
      aria-label={text}
      style={{ display: "inline-flex", alignItems: "center", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: size, lineHeight: `${h}px`, color, fontVariantNumeric: "tabular-nums" }}
    >
      {text.split("").map((ch, i) => {
        if (!/\d/.test(ch)) return <span key={`s${text.length - i}`}>{ch}</span>;
        // key by position from the right so digits keep their slot as the number grows
        const fromRight = text.length - i;
        return (
          <span key={`d${fromRight}`} aria-hidden style={{ display: "inline-block", height: h, overflow: "hidden", width: "0.62em" }}>
            <span style={{ display: "flex", flexDirection: "column", transform: `translateY(${-Number(ch) * h}px)`, transition: "transform 0.6s cubic-bezier(.2,.8,.2,1)" }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <span key={d} style={{ height: h, textAlign: "center" }}>
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
