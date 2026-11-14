import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

// Natural-sounding speech via ElevenLabs. Optional: without ELEVENLABS_API_KEY this
// returns 503 and the app falls back to the built-in browser voice.
// ELEVENLABS_VOICE_ID picks the voice (default: "Daniel", a British male).
const DEFAULT_VOICE = "onwK4e9ZLuTAKqWW03F9";

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Premium voice not configured" }, { status: 503 });

  const user = await getCurrentUser();
  if (!user || !["owner", "pm"].includes(user.profile.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const { text } = (await request.json().catch(() => ({}))) as { text?: string };
  if (!text || !text.trim()) return NextResponse.json({ error: "No text" }, { status: 400 });

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: text.slice(0, 1200), // caps cost per reply
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15 },
    }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    return NextResponse.json({ error: `Voice service error (${res.status}): ${detail}` }, { status: 502 });
  }
  return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
