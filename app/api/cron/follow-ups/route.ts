import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailConfigured } from "@/lib/email/send";
import { isFollowUpDue, sendBidFollowUp } from "@/lib/crm/followup";
import type { Bid } from "@/lib/types/database";

// Daily job (see vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
// Sends every automatic bid follow-up that has come due, from the app's sender with
// Reply-To the person who created the bid.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!emailConfigured()) return NextResponse.json({ error: "Email is not configured (RESEND_API_KEY / EMAIL_FROM)" }, { status: 503 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("bids").select("*").eq("stage", "submitted").eq("auto_follow_up", true).not("contact_email", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const due = ((data ?? []) as Bid[]).filter((b) => isFollowUpDue(b));
  const results: { bid: string; ok: boolean; error?: string }[] = [];

  for (const bid of due) {
    try {
      const [{ data: company }, { data: creator }] = await Promise.all([
        admin.from("companies").select("name").eq("id", bid.company_id).single(),
        bid.created_by ? admin.from("profiles").select("full_name, auth_user_id").eq("id", bid.created_by).single() : Promise.resolve({ data: null }),
      ]);
      let replyTo: string | undefined;
      if (creator?.auth_user_id) replyTo = (await admin.auth.admin.getUserById(creator.auth_user_id)).data.user?.email ?? undefined;
      await sendBidFollowUp(admin, bid, {
        company: company?.name ?? "Our team",
        senderName: creator?.full_name && !creator.full_name.includes("@") ? creator.full_name : company?.name ?? "Our team",
        replyTo,
        kind: "auto",
      });
      results.push({ bid: bid.id, ok: true });
    } catch (e) {
      results.push({ bid: bid.id, ok: false, error: e instanceof Error ? e.message : "failed" });
    }
  }
  return NextResponse.json({ checked: (data ?? []).length, due: due.length, results });
}
