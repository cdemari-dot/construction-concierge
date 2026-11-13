export interface PayrollCsvRow {
  workerName: string;
  jobNumber: string;
  totalHours: number;
}

export function buildPayrollCsv(rows: PayrollCsvRow[]): string {
  const header = "Worker,Job,Total Hours";
  const lines = rows.map((r) => `"${r.workerName.replace(/"/g, '""')}",${r.jobNumber},${r.totalHours.toFixed(2)}`);
  return [header, ...lines].join("\n") + "\n";
}

export function hoursBetween(clockInAt: string, clockOutAt: string): number {
  const ms = new Date(clockOutAt).getTime() - new Date(clockInAt).getTime();
  return Math.max(0, ms / 1000 / 60 / 60);
}
