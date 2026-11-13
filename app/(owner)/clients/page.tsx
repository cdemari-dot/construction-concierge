import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { AddClientForm } from "@/components/dashboard/AddClientForm";
import type { Client } from "@/lib/types/database";

export default async function ClientsPage() {
  if (!isSupabaseConfigured) return <SetupBanner />;

  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("*").order("name");
  const list = (clients ?? []) as Client[];

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 16 }}>
        Clients (GCs)
      </h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <AddClientForm />
        <section className="cc-card">
          <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 4 }}>
            All clients
          </h3>
          <div>
            {list.map((c) => (
              <div key={c.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0", fontSize: 13 }}>
                <b>{c.name}</b>
                <div style={{ color: "var(--mute)", fontSize: 11.5 }}>
                  {[c.contact_name, c.contact_phone, c.contact_email].filter(Boolean).join(" · ") || "No contact info"}
                </div>
              </div>
            ))}
            {list.length === 0 && <div style={{ color: "var(--mute)", fontSize: 13, paddingTop: 10 }}>No clients yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
