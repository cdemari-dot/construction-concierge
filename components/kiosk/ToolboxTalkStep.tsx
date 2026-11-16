"use client";

export function ToolboxTalkStep({ title, body, onAcknowledge }: { title: string; body: string; onAcknowledge: () => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, color: "var(--mute)", fontWeight: 600 }}>Today&apos;s safety talk</div>
      <div className="display fa-title" style={{ marginTop: 6 }}>
        {title}
      </div>
      <div className="cc-card" style={{ margin: "12px 0", fontSize: 17, lineHeight: 1.65 }}>
        {body}
      </div>
      <button className="fa-btn go" onClick={onAcknowledge} type="button">
        I heard it and understand
      </button>
    </div>
  );
}
