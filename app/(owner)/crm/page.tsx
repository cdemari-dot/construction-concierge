import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { StatCard } from "@/components/ui/StatCard";
import { BidBoard } from "@/components/crm/BidBoard";
import { BidForm } from "@/components/crm/BidForm";
import { ConversionFunnel } from "@/components/crm/ConversionFunnel";
import { fmt } from "@/lib/format";
import { todayToronto } from "@/lib/today";
import type { Bid, Client } from "@/lib/types/database";

export default async function CrmPage() {
  if (!isSupabaseConfigured) return <SetupBanner />;

  const supabase = await createClient();
  const [{ data: bidRows, error }, { data: clientRows }] = await Promise.all([
    supabase.from("bids").select("*").order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name"),
  ]);

  if (error) {
    return (
      <div>
        <h1 className="display" style={{ fontSize: 22, marginBottom: 12 }}>CRM</h1>
        <div className="fa-err">⚠️ Couldn&apos;t load bids: {error.message}. The bids table may not be set up yet.</div>
      </div>
    );
  }

  const bids = (bidRows ?? []) as Bid[];
  const clients = (clientRows ?? []) as Pick<Client, "id" | "name">[];
  const today = todayToronto();

  const open = bids.filter((b) => ["lead", "estimating", "submitted"].includes(b.stage));
  const pipeline = open.reduce((s, b) => s + Number(b.value), 0);
  const won = bids.filter((b) => b.stage === "won");
  const lost = bids.filter((b) => b.stage === "lost");
  const decided = won.length + lost.length;
  const winRate = decided > 0 ? Math.round((won.length / decided) * 100) : null;
  const followUps = open.filter((b) => b.follow_up_on && b.follow_up_on <= today).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <h1 className="display" style={{ fontSize: 22 }}>CRM · Bid pipeline</h1>
        <BidForm clients={clients} />
      </div>
      <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16 }}>
        Drag a bid between columns, or use the dropdown on the card. Mark one Won, then create the job in one click.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 18 }}>
        <StatCard index={0} label="Open pipeline" value={fmt(pipeline)} hint={`${open.length} open bid${open.length === 1 ? "" : "s"}`} />
        <StatCard index={1} label="Won" value={fmt(won.reduce((s, b) => s + Number(b.value), 0))} color="lime" hint={`${won.length} bid${won.length === 1 ? "" : "s"}`} />
        <StatCard index={2} label="Win rate" value={winRate == null ? "—" : `${winRate}%`} color="cyan" hint={decided ? `${won.length} won of ${decided} decided` : "no decided bids yet"} />
        <StatCard index={3} label="Follow-ups due" value={String(followUps)} color={followUps > 0 ? "amber" : undefined} hint={followUps > 0 ? "call these today" : "all caught up"} />
      </div>

      <ConversionFunnel
        d={{
          created: bids.length,
          sent: bids.filter((b) => b.submitted_at != null || b.stage === "submitted" || b.stage === "won").length,
          won: won.length,
          lost: lost.length,
          wonValue: won.reduce((s, b) => s + Number(b.value), 0),
          lostValue: lost.reduce((s, b) => s + Number(b.value), 0),
        }}
      />

      <BidBoard bids={bids} clientNames={Object.fromEntries(clients.map((c) => [c.id, c.name]))} />
    </div>
  );
}
