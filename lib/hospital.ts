import { distanceMeters } from "@/lib/geo";

export interface Hospital {
  name: string;
  address: string | null;
  phone: string | null;
  lat: number;
  lon: number;
  distanceM: number;
  emergency: boolean;
}

interface OverpassEl {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// Nearest hospital to a point, from OpenStreetMap (Overpass, free, no key).
// Prefers hospitals with an emergency department; widens the search if nothing is close.
export async function fetchNearestHospital(lat: number, lon: number): Promise<Hospital | null> {
  for (const radius of [25000, 80000]) {
    const q = `[out:json][timeout:20];nwr["amenity"="hospital"](around:${radius},${lat},${lon});out center tags 60;`;
    const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q) });
    if (!res.ok) throw new Error(`Hospital lookup returned ${res.status}`);
    const els = ((await res.json()).elements ?? []) as OverpassEl[];
    const list: Hospital[] = els
      .map((e) => {
        const la = e.lat ?? e.center?.lat;
        const lo = e.lon ?? e.center?.lon;
        const t = e.tags ?? {};
        if (la == null || lo == null || !t.name) return null;
        const street = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
        const address = [street, t["addr:city"]].filter(Boolean).join(", ") || null;
        return {
          name: t.name,
          address,
          phone: t.phone ?? t["contact:phone"] ?? null,
          lat: la,
          lon: lo,
          distanceM: Math.round(distanceMeters(lat, lon, la, lo)),
          emergency: t.emergency === "yes",
        } as Hospital;
      })
      .filter((h): h is Hospital => h !== null);
    if (list.length === 0) continue;
    const er = list.filter((h) => h.emergency);
    const pool = er.length ? er : list;
    pool.sort((a, b) => a.distanceM - b.distanceM);
    return pool[0];
  }
  return null;
}
