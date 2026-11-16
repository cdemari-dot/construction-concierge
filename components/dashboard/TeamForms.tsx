"use client";

import { useState, useTransition } from "react";
import { addCrewMember, changeWorkerPin, deactivateCrewMember, inviteTeamMember, setPayRate } from "@/app/(owner)/team/actions";
import type { Profile } from "@/lib/types/database";

const inputStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line2)",
  borderRadius: 10,
  color: "var(--text)",
  padding: "9px 10px",
  fontSize: 14,
  width: "100%",
  minWidth: 0,
};

export function AddCrewForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="cc-card"
      style={{ display: "grid", gap: 10 }}
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          try {
            await addCrewMember(formData);
            (document.getElementById("add-crew-form") as HTMLFormElement)?.reset();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to add crew member");
          }
        })
      }
      id="add-crew-form"
    >
      <h3 style={{ fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--mute)" }}>
        Add Foreman / Worker (PIN, no login)
      </h3>
      {error && <div style={{ color: "var(--red)", fontSize: 12.5 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input name="full_name" placeholder="Full name" required style={inputStyle} />
        <select name="role" style={inputStyle} defaultValue="worker">
          <option value="worker">Worker</option>
          <option value="foreman">Foreman</option>
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input name="phone" placeholder="Phone (optional)" style={inputStyle} />
        <input name="pin" placeholder="4-digit PIN" required pattern="[0-9]{4}" maxLength={4} style={inputStyle} />
      </div>
      <label style={{ fontSize: 11.5, color: "var(--mute)", display: "grid", gap: 4 }}>
        Hourly cost to you, $/hr (wage plus payroll burden — only Owner/PM can see this)
        <input name="hourly_rate" type="number" min="0" step="0.01" placeholder="e.g. 48.50" style={inputStyle} />
      </label>
      <button className="cc-btn lime" type="submit" disabled={pending} style={{ justifySelf: "start" }}>
        {pending ? "Adding…" : "Add to crew"}
      </button>
    </form>
  );
}

export function InviteTeamForm() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="cc-card"
      style={{ display: "grid", gap: 10 }}
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          setNotice(null);
          const email = String(formData.get("email"));
          try {
            await inviteTeamMember(formData);
            setNotice(`Invited. Tell them to sign up at /accept-invite using ${email} — that links them to this company automatically.`);
            (document.getElementById("invite-form") as HTMLFormElement)?.reset();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to invite");
          }
        })
      }
      id="invite-form"
    >
      <h3 style={{ fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--mute)" }}>
        Invite Foreman / PM / Owner (real login)
      </h3>
      {error && <div style={{ color: "var(--red)", fontSize: 12.5 }}>{error}</div>}
      {notice && <div style={{ color: "var(--lime)", fontSize: 12.5 }}>{notice}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input name="full_name" placeholder="Full name" required style={inputStyle} />
        <select name="role" style={inputStyle} defaultValue="pm">
          <option value="pm">PM</option>
          <option value="foreman">Foreman (own login for the field app)</option>
          <option value="owner">Owner</option>
          <option value="worker">Kiosk login (jobsite iPad, Crew Punch)</option>
        </select>
      </div>
      <input name="email" type="email" placeholder="Email" required style={inputStyle} />
      <button className="cc-btn lime" type="submit" disabled={pending} style={{ justifySelf: "start" }}>
        {pending ? "Inviting…" : "Send invite"}
      </button>
    </form>
  );
}

export function CrewRow({ profile, isSelf, rate }: { profile: Profile; isSelf: boolean; rate: number | null }) {
  const [editingPin, setEditingPin] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hasLogin = profile.role === "owner" || profile.role === "pm";
  const [rateText, setRateText] = useState(rate == null ? "" : String(rate));
  const [rateSaved, setRateSaved] = useState(false);

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", padding: "10px 0", fontSize: 13 }}>
      <div>
        <b>{profile.full_name}</b>{" "}
        <span style={{ color: "var(--mute)" }}>
          · {profile.role}
          {profile.status === "inactive" ? " · inactive" : ""}
        </span>
        <div style={{ color: "var(--mute)", fontSize: 11.5 }}>
          {profile.email ?? profile.phone ?? "no email or phone on file"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {error && <span style={{ color: "var(--red)", fontSize: 11.5 }}>{error}</span>}
        {(
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }} title="Loaded cost per hour: wage plus payroll burden. Only Owner/PM can see this.">
            {rate == null && !rateSaved && <span className="cc-tag amber">no rate set</span>}
            <span style={{ color: "var(--mute)", fontSize: 11.5 }}>$</span>
            <input
              value={rateText}
              onChange={(e) => {
                setRateText(e.target.value);
                setRateSaved(false);
              }}
              placeholder="/hr"
              inputMode="decimal"
              style={{ ...inputStyle, width: 70, padding: "5px 8px" }}
            />
            <button
              className="cc-btn ghost sm"
              disabled={pending || rateText.trim() === ""}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  try {
                    await setPayRate(profile.id, Number(rateText));
                    setRateSaved(true);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed");
                  }
                })
              }
              type="button"
            >
              {rateSaved ? "Saved" : "Set rate"}
            </button>
          </span>
        )}
        {!hasLogin &&
          (editingPin ? (
            <>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="New 4-digit PIN"
                maxLength={4}
                style={{ ...inputStyle, width: 120, padding: "5px 8px" }}
              />
              <button
                className="cc-btn sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    try {
                      await changeWorkerPin(profile.id, pin);
                      setEditingPin(false);
                      setPin("");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed");
                    }
                  })
                }
                type="button"
              >
                Save
              </button>
            </>
          ) : (
            <button className="cc-btn ghost sm" onClick={() => setEditingPin(true)} type="button">
              Change PIN
            </button>
          ))}
        {profile.status === "active" && !isSelf && (
          <button
            className="cc-btn ghost sm"
            disabled={pending}
            onClick={() => startTransition(() => deactivateCrewMember(profile.id))}
            type="button"
          >
            Deactivate
          </button>
        )}
      </div>
    </div>
  );
}
