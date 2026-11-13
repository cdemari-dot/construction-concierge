export function fmt(n: number): string {
  return (n < 0 ? "-" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-CA");
}

export function fmtk(n: number): string {
  const abs = Math.abs(n);
  const body = abs >= 1_000_000 ? (abs / 1_000_000).toFixed(2) + "M" : Math.round(abs / 1000) + "k";
  return (n < 0 ? "-" : "") + "$" + body;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });
}
