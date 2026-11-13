import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { ChangeOrderRow } from "@/components/dashboard/ChangeOrderRow";
import type { ChangeOrder, Job } from "@/lib/types/database";

export default async function ChangeOrdersPage() {
  if (!isSupabaseConfigured) return <SetupBanner />;

  const supabase = await createClient();
  const [{ data: changeOrders }, { data: jobs }] = await Promise.all([
    supabase.from("change_orders").select("*").order("created_at", { ascending: false }),
    supabase.from("jobs").select("id, job_number"),
  ]);

  const cos = (changeOrders ?? []) as ChangeOrder[];
  const jobLabel = new Map((jobs ?? []).map((j: Pick<Job, "id" | "job_number">) => [j.id, j.job_number]));

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>
        Change Orders
      </h1>
      <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16 }}>
        Field reports an extra → you price it → send to the GC → mark approved or disputed once they respond.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        {cos.map((co) => (
          <ChangeOrderRow key={co.id} co={co} jobLabel={jobLabel.get(co.job_id) ?? co.job_id} />
        ))}
        {cos.length === 0 && <div className="cc-card" style={{ color: "var(--mute)" }}>No change orders yet.</div>}
      </div>
    </div>
  );
}
