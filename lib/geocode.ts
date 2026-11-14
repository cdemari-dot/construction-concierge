// Best-effort address lookup via OpenStreetMap Nominatim; a failure just
// means the job has no pin until coordinates are added.
export async function geocode(address: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`, {
      headers: { "User-Agent": "ConstructionConcierge/1.0 (constructionconcierge.ai)" },
      signal: AbortSignal.timeout(5000),
    });
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? [Number(hit.lat), Number(hit.lon)] : null;
  } catch {
    return null;
  }
}
