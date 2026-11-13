"use client";

import { useState } from "react";
import { REPORT_CATEGORIES } from "@/lib/kiosk/constants";

export function InjuryQuestionStep({ onAnswer }: { onAnswer: (hurt: boolean) => void }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: "var(--mute)" }}>BEFORE YOU CLOCK OUT</div>
      <div className="display" style={{ fontSize: 26, margin: "20px 0 26px" }}>
        Were you hurt or injured at work today?
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="cc-btn lime" style={{ flex: 1, padding: 26, fontSize: 22 }} onClick={() => onAnswer(false)} type="button">
          No
        </button>
        <button className="cc-btn red" style={{ flex: 1, padding: 26, fontSize: 22 }} onClick={() => onAnswer(true)} type="button">
          Yes
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--mute)", marginTop: 14 }}>
        Documentation only — this is not a WSIB filing.
      </div>
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
      <div className="display" style={{ fontSize: 22, marginBottom: 6 }}>
        Let&apos;s get it logged
      </div>
      <div style={{ color: "var(--mute)", fontSize: 13, marginBottom: 12 }}>
        The office and your foreman are notified as soon as you submit.
      </div>
      <textarea
        rows={3}
        placeholder="What happened? Which body part?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 12, color: "var(--text)", padding: 10, fontSize: 14, marginBottom: 10 }}
      />
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button
          type="button"
          className="cc-btn ghost"
          style={{ flex: 1, borderColor: firstAidGiven ? "var(--lime)" : undefined, color: firstAidGiven ? "var(--lime)" : undefined }}
          onClick={() => setFirstAidGiven((v) => !v)}
        >
          First aid given on site
        </button>
        <button
          type="button"
          className="cc-btn ghost"
          style={{ flex: 1, borderColor: needsMedical ? "var(--red)" : undefined, color: needsMedical ? "var(--red)" : undefined }}
          onClick={() => setNeedsMedical((v) => !v)}
        >
          Needs medical attention
        </button>
      </div>
      <button className="cc-btn red" style={{ width: "100%", padding: 16 }} onClick={() => onSubmit({ description, firstAidGiven, needsMedical })} type="button">
        Save to record
      </button>
    </div>
  );
}

export function ReportStep({ onSubmit }: { onSubmit: (data: { category: string; details: string }) => void }) {
  const [category, setCategory] = useState(REPORT_CATEGORIES[0]);
  const [details, setDetails] = useState("");

  return (
    <div>
      <div className="display" style={{ fontSize: 22, marginBottom: 12 }}>
        Anything to report?
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {REPORT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className="cc-btn ghost"
            style={{ fontSize: 13, borderColor: category === c ? "var(--lime)" : undefined, color: category === c ? "var(--lime)" : undefined }}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        placeholder="Details (optional)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 12, color: "var(--text)", padding: 10, fontSize: 14, marginBottom: 12 }}
      />
      <button className="cc-btn red" style={{ width: "100%", padding: 16 }} onClick={() => onSubmit({ category, details })} type="button">
        ⏹ Clock out
      </button>
    </div>
  );
}
