"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export function QrLink({ path, label, hint }: { path: string; label: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  // Built in the browser so it's right on any domain (localhost, the vercel.app preview, the real site).
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  return (
    <div className="cc-card" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ background: "#fff", padding: 8, borderRadius: 10, lineHeight: 0 }}>
        <QRCodeSVG value={url} size={112} />
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <b>{label}</b>
        {hint && <div style={{ color: "var(--mute)", fontSize: 12, marginTop: 2 }}>{hint}</div>}
        <div className="mono" style={{ fontSize: 11, color: "var(--mute)", margin: "8px 0", wordBreak: "break-all" }}>
          {path}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="cc-btn lime sm" href={path} target="_blank" rel="noopener noreferrer">
            Open
          </a>
          <button
            className="cc-btn ghost sm"
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {}
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
