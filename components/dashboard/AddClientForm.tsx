"use client";

import { useRef, useTransition } from "react";
import { addClient } from "@/app/(owner)/clients/actions";

const inputStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line2)",
  borderRadius: 10,
  color: "var(--text)",
  padding: "9px 10px",
  fontSize: 14,
};

export function AddClientForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="cc-card"
      style={{ display: "grid", gap: 10 }}
      action={(formData) =>
        startTransition(async () => {
          await addClient(formData);
          formRef.current?.reset();
        })
      }
    >
      <h3 style={{ fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--mute)" }}>
        Add a GC / client
      </h3>
      <input name="name" placeholder="Company name" required style={inputStyle} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input name="contact_name" placeholder="Contact name" style={inputStyle} />
        <input name="contact_phone" placeholder="Contact phone" style={inputStyle} />
      </div>
      <input name="contact_email" type="email" placeholder="Contact email" style={inputStyle} />
      <button className="cc-btn lime" type="submit" disabled={pending} style={{ justifySelf: "start" }}>
        {pending ? "Adding…" : "Add client"}
      </button>
    </form>
  );
}
