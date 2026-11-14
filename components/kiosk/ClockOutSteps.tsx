"use client";

import { useState } from "react";
import { REPORT_CATEGORIES } from "@/lib/kiosk/constants";

const CATEGORY_EMOJI: Record<string, string> = {
  "Nothing to report": "👍",
  "Near miss": "😮‍💨",
  Hazard: "⚠️",
  Damage: "💥",
  "Equipment issue": "🔧",
  "Short on material": "📦",
};

export function InjuryQuestionStep({ onAnswer }: { onAnswer: (hurt: boolean) => void }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 52 }}>🩹</div>
      <div className="display fa-title" style={{ margin: "6px 0 18px" }}>
        Were you hurt at work today?
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="fa-btn go" style={{ marginTop: 0, minHeight: 96, fontSize: 22 }} onClick={() => onAnswer(false)} type="button">
          👍 No
        </button>
        <button className="fa-btn stop" style={{ marginTop: 0, minHeight: 96, fontSize: 22 }} onClick={() => onAnswer(true)} type="button">
          🤕 Yes
        </button>
      </div>
      <div style={{ fontSize: 13, color: "var(--mute)", marginTop: 14 }}>This is just for our records. It is not a WSIB filing.</div>
    </div>
  );
}

export function InjuryFormStep({
  onSubmit,
}: {
  onSubmit: (data: { description: string; firstAidGiven: boolean; needsMedical: boolean }) => void;
}) {
  const [description, setDescription] = useState("");
  const [firstAidGiven, setFirstAidGiven] = useState(false);
  const [needsMedical, setNeedsMedical] = useState(false);

  return (
    <div>
      <div className="display fa-title">🤕 Let&apos;s get it written down</div>
      <div className="fa-help">The office and your foreman are told as soon as you save.</div>
      <textarea
        className="fa-input"
        rows={4}
        placeholder="What happened? Which body part?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="fa-chips" style={{ marginTop: 12 }}>
        <button type="button" className={`fa-chip ${firstAidGiven ? "on" : ""}`} onClick={() => setFirstAidGiven((v) => !v)}>
          <span className="e">🩺</span>First aid given
        </button>
        <button type="button" className={`fa-chip ${needsMedical ? "on" : ""}`} onClick={() => setNeedsMedical((v) => !v)}>
          <span className="e">🚑</span>Needs a doctor
        </button>
      </div>
      <button
        className="fa-btn stop"
        disabled={!description.trim()}
        onClick={() => onSubmit({ description, firstAidGiven, needsMedical })}
        type="button"
      >
        💾 Save to record
      </button>
    </div>
  );
}

export function ReportStep({ onSubmit }: { onSubmit: (data: { category: string; details: string }) => void }) {
  const [category, setCategory] = useState(REPORT_CATEGORIES[0]);
  const [details, setDetails] = useState("");

  return (
    <div>
      <div className="display fa-title">📋 Anything to tell the office?</div>
      <div className="fa-chips" style={{ margin: "12px 0" }}>
        {REPORT_CATEGORIES.map((c) => (
          <button key={c} type="button" className={`fa-chip ${category === c ? "on" : ""}`} onClick={() => setCategory(c)}>
            <span className="e">{CATEGORY_EMOJI[c] ?? "🔹"}</span>
            {c}
          </button>
        ))}
      </div>
      {category !== REPORT_CATEGORIES[0] && (
        <textarea className="fa-input" rows={3} placeholder="Tell us a bit more (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
      )}
      <button className="fa-btn stop" onClick={() => onSubmit({ category, details })} type="button">
        🏁 Clock out
      </button>
    </div>
  );
}
