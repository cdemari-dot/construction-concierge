// Sends one email through Resend (REST, no SDK). Used for T&M copies and bid follow-ups.
export interface OutgoingEmail {
  from: string;
  to: string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

// "Demstos <tickets@constructionconcierge.ai>" -> the address part.
export function senderAddress(): string {
  const raw = process.env.EMAIL_FROM ?? "";
  return /<([^>]+)>/.exec(raw)?.[1] ?? raw;
}

export async function sendEmail(mail: OutgoingEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Email is not set up yet (RESEND_API_KEY missing).");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: mail.from,
      to: mail.to,
      cc: mail.cc?.length ? mail.cc : undefined,
      reply_to: mail.replyTo,
      subject: mail.subject,
      html: mail.html,
      attachments: mail.attachments,
    }),
  });
  if (!res.ok) throw new Error(`Email failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
}
