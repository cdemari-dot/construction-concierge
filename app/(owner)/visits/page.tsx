import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { Tag } from "@/components/ui/Tag";
import { AddVisitForm, VisitActions } from "@/components/dashboard/VisitForms";
import { todayToronto } from "@/lib/today";
import type { Bid, Job, Profile, SiteVisit } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const timeLabel = (t: string | null) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
};

export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ bid?: string }> }) {
  if (!isSupabaseConfigured) return <SetupBanner />;
  const { bid: bidParam } = await searchParams;
  const supabase = await createClient();
  const today = todayToronto();

  const [{ data: visits }, { data: bids }, { data: jobs }, { data: staff }] = await Promise.all([
    supabase.from("site_visits").select("*").order("visit_on").order("start_time"),
    supabase.from("bids").select("*").not("stage", "in", "(won,lost)").order("created_at", { ascending: false }),
    supabase.from("jobs").select("*").eq("status", "active").order("job_number"),
    supabase.from("profiles").select("*").in("role", ["owner", "pm", "foreman"]).eq("status", "active").order("full_name"),
  ]);
  const all = (visits ?? []) as SiteVisit[];
  const bidList = (bids ?? []) as Bid[];
  const jobList = (jobs ?? []) as Job[];
  const people = (staff ?? []) as Profile[];
  const who = new Map(people.map((p) => [p.id, p.full_name]));
  const bidName = new Map(bidList.map((b) => [b.id, b.name]));

  const prefill = bidList.find((b) => b.id === bidParam);
  const upcoming = all.filter((v) => v.status === "scheduled" && v.visit_on >= today);
  const overdue = all.filter((v) => v.status === "scheduled" && v.visit_on < today);
  const past = all.filter((v) => v.status !== "scheduled").sort((a, b) => (a.visit_on < b.visit_on ? 1 : -1)).slice(0, 15);

  const byDay = new Map<string, SiteVisit[]>();
  for (const v of upcoming) byDay.set(v.visit_on, [...(byDay.get(v.visit_on) ?? []), v]);

  const card = (v: SiteVisit, i: number) => (
    <div key={v.id} className="cc-card cc-in" style={{ display: "grid", gap: 4, "--i": i } as React.CSSProperties}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <b>{v.title}</b>
        <span style={{ display: "flex", gap: 6 }}>
          {v.status === "done" && <Tag color="lime">done</Tag>}
          {v.status === "cancelled" && <Tag color="red">cancelled</Tag>}
          {v.status === "scheduled" && v.visit_on < today && <Tag color="amber">overdue</Tag>}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--mute)" }}>
        {dayLabel(v.visit_on)}
        {v.start_time ? ` · ${timeLabel(v.start_time)}` : ""}
        {v.assigned_to ? ` · ${who.get(v.assigned_to) ?? "Assigned"}` : ""}
        {v.bid_id && bidName.get(v.bid_id) ? ` · bid: ${bidName.get(v.bid_id)}` : ""}
      </div>
      {v.address && (
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, textDecoration: "underline" }}>
          {v.address}
        </a>
      )}
      {v.notes && <div style={{ fontSize: 13 }}>{v.notes}</div>}
      <div style={{ marginTop: 4 }}>
        <VisitActions id={v.id} status={v.status} title={v.title} />
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>Site visits</h1>
      <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16 }}>Schedule walk-throughs for bids and jobs. Tap the address to open it in Maps.</p>

      <AddVisitForm
        key={prefill?.id ?? "new"}
        bids={bidList.map((b) => ({ id: b.id, label: b.name, address: b.address }))}
        jobs={jobList.map((j) => ({ id: j.id, label: `${j.job_number} · ${j.name}` }))}
        people={people.map((p) => ({ id: p.id, label: p.full_name }))}
        defaults={{ bidId: prefill?.id ?? "", title: prefill ? `Site visit: ${prefill.name}` : "", address: prefill?.address ?? "" }}
      />

      {overdue.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--amber)", marginBottom: 10 }}>Overdue: mark done or cancel</h3>
          <div style={{ display: "grid", gap: 10 }}>{overdue.map(card)}</div>
        </section>
      )}

      <section style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 10 }}>Upcoming</h3>
        {byDay.size === 0 && <div className="cc-card" style={{ color: "var(--mute)", fontSize: 13 }}>No visits scheduled.</div>}
        {[...byDay.entries()].map(([day, list]) => (
          <div key={day} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, margin: "8px 0" }}>{day === today ? "Today" : dayLabel(day)}</div>
            <div style={{ display: "grid", gap: 10 }}>{list.map(card)}</div>
          </div>
        ))}
      </section>

      {past.length > 0 && (
        <section>
          <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 10 }}>Done and cancelled</h3>
          <div style={{ display: "grid", gap: 10 }}>{past.map(card)}</div>
        </section>
      )}
    </div>
  );
}
