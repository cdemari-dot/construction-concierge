// Best-effort address lookup via OpenStreetMap Nominatim; a failure just
// means the job has no pin until coordinates are added.
//
// Job addresses often carry unit/suite/floor details ("220 Yonge St, Unit A042C, Toronto",
// "95 Wellington St W, 16th floor, Toronto") that the map service cannot match, so we try the
// address as typed first, then simplified versions of it, restricted to Canada.

function candidates(address: string): string[] {
  const original = address.trim();
  const parts = original.split(",").map((p) => p.trim()).filter(Boolean);
  const isDetail = (p: string) => /\b(suite|ste|unit|floor|fl|level|lvl|room|rm)\b|^#|^\d+(st|nd|rd|th)\b/i.test(p);
  const kept = parts.filter((p) => !isDetail(p));
  // "181 University Ave, Suite 2000" -> street keeps working; also drop "& 14 Dyas" style tails and "Suite 500" glued on
  const stripInline = (p: string) => p.replace(/\s*(&|and)\s+\d.*$/i, "").replace(/\s+(suite|ste|unit|floor|fl)\b.*$/i, "").replace(/\s+#\S+.*$/, "").trim();
  const cleaned = kept.map(stripInline).filter(Boolean);
  const simple = cleaned.join(", ");
  const hasRegion = /\b(ontario|on|quebec|qc|canada)\b/i.test(simple);
  const list = [original, simple, hasRegion ? "" : `${simple}, Ontario, Canada`, cleaned.length > 2 ? `${cleaned[0]}, ${cleaned[1]}, Ontario, Canada` : ""];
  return [...new Set(list.filter(Boolean))];
}

async function lookup(q: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": "ConstructionConcierge/1.0 (constructionconcierge.ai)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? [Number(hit.lat), Number(hit.lon)] : null;
  } catch {
    return null;
  }
}

export async function geocode(address: string): Promise<[number, number] | null> {
  let first = true;
  for (const q of candidates(address)) {
    if (!first) await new Promise((r) => setTimeout(r, 1100)); // the service asks for at most 1 request a second
    first = false;
    const hit = await lookup(q);
    if (hit) return hit;
  }
  return null;
}
