// Haversine distance in meters between two lat/lon points.
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeoResult {
  lat: number | null;
  lon: number | null;
  withinGeofence: boolean | null;
}

export function getCurrentPosition(
  jobLat: number | null,
  jobLon: number | null,
  radiusM: number,
): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: null, lon: null, withinGeofence: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const withinGeofence =
          jobLat == null || jobLon == null ? null : distanceMeters(lat, lon, jobLat, jobLon) <= radiusM;
        resolve({ lat, lon, withinGeofence });
      },
      () => resolve({ lat: null, lon: null, withinGeofence: null }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}
