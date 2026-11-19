"use client";

import { useState, useTransition } from "react";
import { setCompanyAccess } from "@/app/(owner)/admin/actions";

type Status = "active" | "paused" | "cancelled";

// Pause / cancel / resume a company. Asks first, because it locks every person in that company out.
export function AccessButtons({ companyId, name, status, isMine }: { companyId: string; name: string; status: Status; isMine: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (isMine) return <span style={{ color: "var(--mute)", fontSize: 12 }}>your company</span>;

  const go = (next: Status, message: string) => {
    if (!window.confirm(message)) return;
    setError(null);
    start(async () => {
      try {
        await setCompanyAccess(companyId, next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {status !== "active" && (
        <button className="cc-btn sm" type="button" disabled={pending} onClick={() => go("active", `Resume access for ${name}? Everyone there can use the app again.`)}>
          Resume
        </button>
      )}
      {status === "active" && (
        <button className="cc-btn ghost sm" type="button" disabled={pending} onClick={() => go("paused", `Pause ${name}? Everyone there is locked out until you resume. Their data is kept.`)}>
          Pause
        </button>
      )}
      {status !== "cancelled" && (
        <button className="cc-btn ghost sm" type="button" disabled={pending} onClick={() => go("cancelled", `Cancel ${name}? Everyone there is locked out. Their data is kept and you can resume later.`)}>
          Cancel service
        </button>
      )}
      {error && <span style={{ color: "var(--red)", fontSize: 12 }}>{error}</span>}
    </span>
  );
}
