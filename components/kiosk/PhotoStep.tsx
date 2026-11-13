"use client";

import { useRef } from "react";

export function PhotoStep({
  title,
  onCaptured,
  onCancel,
}: {
  title: string;
  onCaptured: (file: File | null) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: "var(--mute)" }}>{title}</div>
      <div className="display" style={{ fontSize: 24, margin: "8px 0 4px" }}>
        Take a quick photo
      </div>
      <div style={{ color: "var(--mute)", marginBottom: 16, fontSize: 13.5 }}>
        Stamped with GPS location and time, saved with your punch
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: "none" }}
        onChange={(e) => onCaptured(e.target.files?.[0] ?? null)}
      />

      <button className="cc-btn" style={{ display: "block", width: "100%", padding: 28, fontSize: 20, marginBottom: 10 }} onClick={() => inputRef.current?.click()} type="button">
        📸 Take photo
      </button>
      <button className="cc-btn ghost" style={{ display: "block", width: "100%", padding: 14, marginBottom: 10 }} onClick={() => onCaptured(null)} type="button">
        No camera on this device? Use demo photo
      </button>
      <button className="cc-btn ghost" style={{ display: "block", width: "100%", padding: 14, border: 0, color: "var(--mute)" }} onClick={onCancel} type="button">
        Cancel
      </button>
    </div>
  );
}
