import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { createJob } from "../actions";
import { GeoFields } from "@/components/jobs/GeoFields";
import type { Client, Profile } from "@/lib/types/database";

const inputStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line2)",
  borderRadius: 10,
  color: "var(--text)",
  padding: "9px 10px",
  fontSize: 14,
  width: "100%",
};

export default async function NewJobPage() {
  if (!isSupabaseConfigured) return <SetupBanner />;

  const supabase = await createClient();
  const [{ data: clients }, { data: foremen }] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("profiles").select("*").eq("role", "foreman").eq("status", "active"),
  ]);
  const clientList = (clients ?? []) as Client[];
  const foremanList = (foremen ?? []) as Profile[];

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>
        New Job
      </h1>
      {clientList.length === 0 && (
        <p style={{ color: "var(--amber)", fontSize: 13, marginBottom: 12 }}>
          No clients yet — <Link href="/clients" style={{ color: "var(--amber)", textDecoration: "underline" }}>add one first</Link>, or leave the client blank for now.
        </p>
      )}

      <form action={createJob} className="cc-card" style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
            Job number
            <input name="job_number" placeholder="J-26-001" required style={inputStyle} />
          </label>
          <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
            Job name
            <input name="name" required style={inputStyle} />
          </label>
        </div>

        <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
          Client (GC)
          <select name="client_id" style={inputStyle} defaultValue="">
            <option value="">— none yet —</option>
            {clientList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
          Address (used to place the job on the map)
          <input name="address" style={inputStyle} />
        </label>

        <GeoFields />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
            Contract value (CAD)
            <input name="contract_value" type="number" step="0.01" defaultValue={0} style={inputStyle} />
          </label>
          <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
            Start date
            <input name="start_date" type="date" style={inputStyle} />
          </label>
        </div>

        <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
          Foreman
          <select name="foreman_id" style={inputStyle} defaultValue="">
            <option value="">— unassigned —</option>
            {foremanList.map((f) => (
              <option key={f.id} value={f.id}>
                {f.full_name}
              </option>
            ))}
          </select>
        </label>

        <button className="cc-btn lime" type="submit" style={{ justifySelf: "start", marginTop: 4 }}>
          Create job
        </button>
      </form>
    </div>
  );
}
