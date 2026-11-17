"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setCompanyLogo } from "@/app/(owner)/field-reports/actions";

// Lets the owner upload the company logo that prints at the top of sheets.
export function LogoUpload({ companyId, hasLogo }: { companyId: string; hasLogo: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function pick(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      if (file.size > 3_000_000) throw new Error("Logo is over 3 MB. Use a smaller image.");
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const path = `${companyId}/logo-${Date.now()}.${ext}`;
      const up = await createClient().storage.from("company-logos").upload(path, file, { contentType: file.type || "image/png", upsert: true });
      if (up.error) throw new Error(up.error.message);
      await setCompanyLogo(path);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="cc-btn ghost sm" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? "Uploading…" : hasLogo ? "Change logo" : "Upload company logo"}
      </button>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
      {msg && <span style={{ color: "var(--amber)", fontSize: 12 }}>{msg}</span>}
    </>
  );
}
