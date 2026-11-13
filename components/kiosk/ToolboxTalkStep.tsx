"use client";

export function ToolboxTalkStep({ title, body, onAcknowledge }: { title: string; body: string; onAcknowledge: () => void }) {
  return (
    <div>
      <div style={{ fontSize: 12, letterSpacing: 2, color: "var(--mute)" }}>STEP 2 OF 2 · TODAY&apos;S TOOLBOX TALK</div>
      <div className="display" style={{ fontSize: 24, margin: "8px 0 16px" }}>
        {title}
      </div>
      <div className="cc-card" style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
        {body}
      </div>
      <button className="cc-btn" style={{ width: "100%", padding: 18, fontSize: 16 }} onClick={onAcknowledge} type="button">
        ✍️ I attended &amp; understand
      </button>
    </div>
  );
}
