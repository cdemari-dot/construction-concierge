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
      <div style={{ fontSize: 15, color: "var(--mute)", fontWeight: 600 }}>{title}</div>
      <div className="display fa-title" style={{ marginTop: 6 }}>
        Quick selfie
      </div>
      <div className="fa-help">Proves you&apos;re on site. It&apos;s stamped with the time and your location.</div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: "none" }}
        onChange={(e) => onCaptured(e.target.files?.[0] ?? null)}
      />

      <button className="fa-btn go" style={{ minHeight: 84, fontSize: 22 }} onClick={() => inputRef.current?.click()} type="button">
        Take selfie
      </button>
      <button className="fa-btn quiet" style={{ minHeight: 48, fontSize: 14 }} onClick={() => onCaptured(null)} type="button">
        No camera? Use a test photo
      </button>
      <button className="fa-btn quiet" style={{ minHeight: 48, fontSize: 14, border: 0, color: "var(--mute)", marginTop: 4 }} onClick={onCancel} type="button">
        ← Back
      </button>
    </div>
  );
}
