import { ImageResponse } from "next/og";

export const alt = "Construction Concierge: the owner's CFO and back office for subcontractors";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The card shown when the site is shared in a text, email, LinkedIn post or chat.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#fafaf8", color: "#0b0b0b", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, letterSpacing: 4, textTransform: "uppercase", fontWeight: 700 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: "#1fa35a" }} />
          Construction Concierge
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, lineHeight: 1, fontWeight: 800, letterSpacing: -3 }}>Know what every job costs.</div>
          <div style={{ fontSize: 92, lineHeight: 1.1, fontWeight: 500, fontStyle: "italic", letterSpacing: -2 }}>Live.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28, color: "#3a3a37", gap: 40 }}>
          <div style={{ display: "flex" }}>For subcontractors of every trade</div>
          <div style={{ display: "flex" }}>constructionconcierge.ai</div>
        </div>
      </div>
    ),
    size,
  );
}
