import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { buildPayrollCsv, hoursBetween } from "@/lib/csv/payrollCsv";
import type { Job, Profile, TimeEntry } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.profile.role !== "owner" && user.profile.role !== "pm")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { periodStart, periodEnd } = await request.json();
  if (!periodStart || !periodEnd) {
    return NextResponse.json({ error: "periodStart and periodEnd are required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: entries, error } = await supabase
    .from("time_entries")
    .select("*")
    .eq("payroll_status", "approved")
    .not("clock_out_at", "is", null)
    .gte("clock_in_at", periodStart)
    .lt("clock_in_at", periodEnd);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const timeEntries = (entries ?? []) as TimeEntry[];
  if (timeEntries.length === 0) {
    return NextResponse.json({ error: "No approved hours in that period yet" }, { status: 400 });
  }

  const workerIds = [...new Set(timeEntries.map((e) => e.worker_id))];
  const jobIds = [...new Set(timeEntries.map((e) => e.job_id))];

  const [{ data: workers }, { data: jobs }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", workerIds),
    supabase.from("jobs").select("*").in("id", jobIds),
  ]);

  const workerById = new Map(((workers ?? []) as Profile[]).map((w) => [w.id, w]));
  const jobById = new Map(((jobs ?? []) as Job[]).map((j) => [j.id, j]));

  const byWorkerJob = new Map<string, { workerId: string; jobId: string; hours: number }>();
  for (const entry of timeEntries) {
    const key = `${entry.worker_id}:${entry.job_id}`;
    const hours = hoursBetween(entry.clock_in_at, entry.clock_out_at as string);
    const existing = byWorkerJob.get(key);
    if (existing) existing.hours += hours;
    else byWorkerJob.set(key, { workerId: entry.worker_id, jobId: entry.job_id, hours });
  }

  const lines = [...byWorkerJob.values()];
  const totalHours = lines.reduce((s, l) => s + l.hours, 0);

  const { data: batch, error: batchError } = await supabase
    .from("payroll_export_batches")
    .insert({
      company_id: user.profile.company_id,
      period_start: periodStart,
      period_end: periodEnd,
      generated_by: user.profile.id,
      total_hours: totalHours,
    })
    .select()
    .single();

  if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });

  const { error: linesError } = await supabase.from("payroll_export_lines").insert(
    lines.map((l) => ({
      batch_id: batch.id,
      worker_id: l.workerId,
      job_id: l.jobId,
      total_hours: l.hours,
      regular_hours: l.hours,
      overtime_hours: 0,
    })),
  );
  if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 });

  await supabase
    .from("time_entries")
    .update({ payroll_status: "exported" })
    .in("id", timeEntries.map((e) => e.id));

  const csv = buildPayrollCsv(
    lines.map((l) => ({
      workerName: workerById.get(l.workerId)?.full_name ?? l.workerId,
      jobNumber: jobById.get(l.jobId)?.job_number ?? l.jobId,
      totalHours: l.hours,
    })),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="payroll-${periodStart}-to-${periodEnd}.csv"`,
    },
  });
}
