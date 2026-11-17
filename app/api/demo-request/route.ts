import { NextResponse } from "next/server";

const CONTACT = "hello@constructionconcierge.ai";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Public "Book a demo" form. Emails hello@constructionconcierge.ai through Resend. Needs RESEND_API_KEY, and the
// sender domain verified in Resend. A hidden "website" field catches simple bots.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (body.website) return NextResponse.json({ ok: true }); // bot

  const get = (k: string, max = 400) => String(body[k] ?? "").trim().slice(0, max);
  const name = get("name", 120);
  const company = get("company", 160);
  const email = get("email", 200);
  const phone = get("phone", 60);
  const message = get("message", 2000);
  if (!name || !company || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter your name, company and a valid email." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  // Both default to the company inbox; override with EMAIL_FROM / DEMO_REQUEST_TO if they ever change.
  const from = process.env.EMAIL_FROM || `Construction Concierge <${CONTACT}>`;
  const to = process.env.DEMO_REQUEST_TO || CONTACT;
  if (!apiKey) {
    return NextResponse.json({ error: `Online booking isn't switched on yet. Email us at ${CONTACT} and we'll set up your demo.`, fallback: true }, { status: 503 });
  }

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
<h2 style="margin:0 0 12px">New demo request</h2>
<table style="border-collapse:collapse;width:100%">
<tr><td style="padding:6px 0;color:#555">Name</td><td>${esc(name)}</td></tr>
<tr><td style="padding:6px 0;color:#555">Company</td><td>${esc(company)}</td></tr>
<tr><td style="padding:6px 0;color:#555">Email</td><td>${esc(email)}</td></tr>
<tr><td style="padding:6px 0;color:#555">Phone</td><td>${esc(phone) || "—"}</td></tr>
</table>
<p style="margin:16px 0 4px;color:#555">Message</p><p style="margin:0;white-space:pre-wrap">${esc(message) || "—"}</p></div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], reply_to: email, subject: `Demo request: ${company}`, html }),
  });
  if (!res.ok) return NextResponse.json({ error: `We couldn't send that. Please email us at ${CONTACT}.`, fallback: true }, { status: 502 });
  return NextResponse.json({ ok: true });
}
