"use client";

import { useEffect, useState } from "react";
import type { FieldWeek, SiteDay } from "@/lib/fieldWeek";
import { fetchJobWeather, type JobWeather } from "@/lib/weather";
import { Icon } from "./Icon";

const chip = (kind: "ok" | "warn" | "mute" | "bad"): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 9px",
  borderRadius: 8,
  whiteSpace: "nowrap",
  background: kind === "ok" ? "rgba(120,200,140,.14)" : kind === "warn" ? "rgba(224,170,70,.16)" : kind === "bad" ? "rgba(224,100,90,.16)" : "var(--card-a)",
  color: kind === "ok" ? "var(--lime)" : kind === "warn" ? "var(--amber)" : kind === "bad" ? "var(--red)" : "var(--mute)",
});

const label: React.CSSProperties = { fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--mute)", margin: "0 0 8px" };

function greeting(): string {
  const h = Number(new Date().toLocaleString("en-CA", { hour: "numeric", hour12: false, timeZone: "America/Toronto" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function torontoMinutes(d: Date): number {
  const [h, m] = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto" }).split(":").map(Number);
  return h * 60 + m;
}
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" });

export function TodayView({ firstName, week, onOpenSite, onGo }: { firstName: string; week: FieldWeek; onOpenSite: (jobId: string) => void; onGo: (tab: "tm") => void }) {
  const todayIdx = Math.max(0, week.days.findIndex((d) => d.date === week.today));
  const [di, setDi] = useState(todayIdx);
  const [si, setSi] = useState(0);
  const [wx, setWx] = useState<JobWeather | null>(null);

  const day = week.days[di];
  const isToday = day.date === week.today;
  const site: SiteDay | undefined = day.sites[Math.min(si, day.sites.length - 1)];

  const first = week.days[todayIdx].sites.find((s) => s.lat != null && s.lon != null);
  useEffect(() => {
    if (!first || first.lat == null || first.lon == null) return;
    fetchJobWeather(first.lat, first.lon).then(setWx).catch(() => {});
  }, [first]);

  const nowMin = torontoMinutes(new Date());
  const status = (c: SiteDay["crew"][number]): { text: string; kind: "ok" | "warn" | "mute" | "bad" } => {
    if (!isToday) return { text: c.startTime ? `Scheduled ${c.startTime}` : "Scheduled", kind: "mute" };
    if (c.clockedInAt) return { text: c.clockedOut ? "Done for the day" : `On site ${hhmm(c.clockedInAt)}`, kind: c.clockedOut ? "mute" : "ok" };
    if (c.startTime) {
      const [h, m] = c.startTime.split(":").map(Number);
      if (nowMin > h * 60 + m + 15) return { text: "Late, not in", kind: "bad" };
    }
    return { text: "Not in yet", kind: "warn" };
  };

  const dateLine = new Date(`${week.today}T12:00:00Z`).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

  return (
    <div>
      <div style={label}>{dateLine}</div>
      <div className="display" style={{ fontSize: 24, lineHeight: 1.2 }}>
        {greeting()}, {firstName}
      </div>
      <div style={{ color: "var(--mute)", fontSize: 13, display: "flex", alignItems: "center", gap: 6, margin: "6px 0 16px" }}>
        <Icon name="cloud" size={16} /> {wx ? `${wx.tempC}°C, ${wx.summary.toLowerCase()} · wind ${wx.windKmh} km/h` : "Weather loads from your first site"}
      </div>

      <div className="cc-in" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 18 }}>
        {week.days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            onClick={() => {
              setDi(i);
              setSi(0);
            }}
            aria-pressed={i === di}
            style={{
              background: i === di ? "var(--card-a)" : "transparent",
              border: `1px solid ${i === di ? "var(--text)" : "var(--line2)"}`,
              borderRadius: 10,
              padding: "8px 0",
              color: "var(--text)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--mute)" }}>{d.dow}</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{d.day}</div>
            <div style={{ fontSize: 11, color: "var(--mute)" }}>{d.sites.length ? `${d.sites.length} ${d.sites.length > 1 ? "sites" : "site"}` : "Off"}</div>
          </button>
        ))}
      </div>

      <div style={label}>{isToday ? "Your sites today" : `Your sites · ${day.dow} ${day.day}`}</div>
      {day.sites.length === 0 && (
        <div className="cc-card" style={{ marginBottom: 12 }}>
          <b style={{ fontSize: 14 }}>No sites scheduled</b>
          <div style={{ color: "var(--mute)", fontSize: 12.5, marginTop: 2 }}>Nothing is assigned to you on this day. The office sets this on the Schedule page.</div>
        </div>
      )}
      {day.sites.map((s, i) => {
        const inNow = s.crew.filter((c) => c.clockedInAt).length;
        const signed = s.crew.filter((c) => c.clockedInAt && c.signedTalk).length;
        const talkChip = !isToday ? null : inNow === 0 ? <span style={chip("mute")}>Talk ready</span> : signed === inNow ? <span style={chip("ok")}>Talk signed {signed}/{inNow}</span> : <span style={chip("warn")}>Talk signed {signed}/{inNow}</span>;
        return (
          <button
            key={s.jobId}
            type="button"
            className="cc-card cc-in"
            style={{ "--i": i, display: "block", width: "100%", textAlign: "left", marginBottom: 10, borderColor: i === si ? "var(--text)" : undefined } as React.CSSProperties}
            onClick={() => setSi(i)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</div>
                <div style={{ color: "var(--mute)", fontSize: 12.5 }}>{s.address ?? s.jobNumber}</div>
              </div>
              {talkChip}
            </div>
            <div style={{ color: "var(--mute)", fontSize: 12.5, marginTop: 8 }}>{isToday ? `${inNow} of ${s.crew.length} on site` : `${s.crew.length} scheduled`}</div>
          </button>
        );
      })}

      {site && (
        <div className="cc-card cc-in" key={`${day.date}${site.jobId}`}>
          <div style={label}>{isToday ? "Crew today" : "Crew scheduled"}</div>
          {site.crew.length === 0 && <div style={{ color: "var(--mute)", fontSize: 13 }}>Only you are scheduled here.</div>}
          {site.crew.map((c) => {
            const st = status(c);
            return (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderTop: "1px solid var(--line)", fontSize: 14 }}>
                <span>
                  {c.name}
                  {c.offSchedule && <span style={{ ...chip("warn"), marginLeft: 8 }}>Off schedule</span>}
                </span>
                <span style={chip(st.kind)}>{st.text}</span>
              </div>
            );
          })}
          {isToday && site.talkTitle && (
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 4, fontSize: 13, color: "var(--mute)", display: "flex", gap: 8, alignItems: "center" }}>
              <Icon name="shield" size={16} /> Today&apos;s safety talk: {site.talkTitle}. Crew sign it at the punch clock.
            </div>
          )}
          <button type="button" className="fa-btn" style={{ marginTop: 12 }} onClick={() => onOpenSite(site.jobId)}>
            Open this site
          </button>
        </div>
      )}

      {week.draftTm > 0 && (
        <>
          <div style={{ ...label, marginTop: 18 }}>Needs you</div>
          <button type="button" className="cc-card" style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", textAlign: "left" }} onClick={() => onGo("tm")}>
            <span style={{ fontSize: 14 }}>
              {week.draftTm} T&amp;M ticket{week.draftTm > 1 ? "s" : ""} not signed by the super
            </span>
            <Icon name="chevron" size={18} />
          </button>
        </>
      )}
    </div>
  );
}
