// Current conditions at a job's coordinates from Open-Meteo (free, no API key).
export interface JobWeather {
  emoji: string;
  summary: string; // "Light rain"
  tempC: number;
  feelsC: number;
  windKmh: number;
  precipMm: number;
  text: string; // stored on the daily log
}

function describe(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: "☀️", label: "Clear" };
  if (code <= 2) return { emoji: "⛅", label: "Partly cloudy" };
  if (code === 3) return { emoji: "☁️", label: "Overcast" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Fog" };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { emoji: "🌧️", label: "Rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { emoji: "❄️", label: "Snow" };
  if (code >= 80 && code <= 82) return { emoji: "🌧️", label: "Rain showers" };
  if (code >= 95) return { emoji: "⛈️", label: "Thunderstorm" };
  return { emoji: "🌡️", label: "Unknown" };
}

export async function fetchJobWeather(lat: number, lon: number): Promise<JobWeather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
  const c = (await res.json()).current;
  const { emoji, label } = describe(Number(c.weather_code));
  const tempC = Math.round(c.temperature_2m);
  const feelsC = Math.round(c.apparent_temperature);
  const windKmh = Math.round(c.wind_speed_10m);
  const precipMm = Number(c.precipitation) || 0;
  return {
    emoji,
    summary: label,
    tempC,
    feelsC,
    windKmh,
    precipMm,
    text: `${label}, ${tempC}°C (feels ${feelsC}°C), wind ${windKmh} km/h${precipMm > 0 ? `, ${precipMm} mm precip` : ""}`,
  };
}
