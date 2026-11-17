"use client";

import { useState } from "react";

// "Book a demo" form. Posts to /api/demo-request, which emails the owner.
export function DemoForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [mailto, setMailto] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/demo-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const out = (await res.json().catch(() => ({}))) as { error?: string; fallback?: boolean };
      if (!res.ok) {
        if (out.fallback) {
          const body = `Name: ${data.name}\nCompany: ${data.company}\nEmail: ${data.email}\nPhone: ${data.phone || ""}\n\n${data.message || ""}`;
          setMailto(`mailto:hello@constructionconcierge.com?subject=${encodeURIComponent("Demo request: " + data.company)}&body=${encodeURIComponent(body)}`);
        }
        throw new Error(out.error ?? "Something went wrong. Try again.");
      }
      setState("sent");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="demo-done" role="status">
        <h3>Got it. We'll be in touch.</h3>
        <p>Thanks for reaching out. We reply within one business day to set up your walkthrough.</p>
      </div>
    );
  }

  return (
    <form className="demo-form" onSubmit={submit}>
      <label>
        Your name
        <input name="name" required autoComplete="name" placeholder="Alex Martin" />
      </label>
      <label>
        Company
        <input name="company" required autoComplete="organization" placeholder="Martin Mechanical Ltd." />
      </label>
      <label>
        Work email
        <input name="email" type="email" required autoComplete="email" placeholder="alex@company.com" />
      </label>
      <label>
        Phone
        <input name="phone" type="tel" autoComplete="tel" placeholder="416 555 0123" />
      </label>
      <label className="wide">
        Crew size and what you want to fix
        <textarea name="message" rows={3} placeholder="12 people, job cost shows up weeks late" />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      {error && (
        <div className="demo-err" role="alert">
          {error}
          {mailto && (
            <>
              {" "}
              <a href={mailto} className="demo-mail">
                Open a pre-filled email
              </a>
            </>
          )}
        </div>
      )}
      <button className="site-btn primary wide" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Book a demo"}
      </button>
      <p className="demo-alt wide">
        Prefer email? Write to <a href="mailto:hello@constructionconcierge.com">hello@constructionconcierge.com</a>.
        <br />
        We use these details only to reply. See our <a href="/privacy">privacy policy</a>.
      </p>
    </form>
  );
}
