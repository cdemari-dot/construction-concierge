// Browser text-to-speech tuned toward a calm, British "chief of staff" voice.
// Free, no API key, works offline. Quality depends on the voices installed on the
// device (macOS/iOS "Daniel" is the closest match out of the box).

const PREFERRED = [
  /daniel/i, // macOS / iOS en-GB male
  /google uk english male/i, // Chrome
  /microsoft (ryan|george|thomas)/i, // Edge / Windows en-GB male
  /arthur|oliver|malcolm/i,
];

export function pickJarvisVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  for (const re of PREFERRED) {
    const v = voices.find((x) => re.test(x.name) && x.lang.toLowerCase().startsWith("en"));
    if (v) return v;
  }
  return voices.find((v) => v.lang === "en-GB") ?? voices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? null;
}

// Strip anything that sounds silly read aloud.
export function toSpeakable(text: string): string {
  return text
    .replace(/[*_`#>|]/g, "")
    .replace(/\s*[-•]\s+/g, ". ")
    .replace(/\$(\d[\d,]*(?:\.\d+)?)k\b/gi, "$1 thousand dollars")
    .replace(/\$(\d[\d,]*(?:\.\d+)?)/g, "$1 dollars")
    .replace(/\s+/g, " ")
    .trim();
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(toSpeakable(text));
  const v = pickJarvisVoice();
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  } else {
    u.lang = "en-GB";
  }
  u.rate = 0.96;
  u.pitch = 0.82; // slightly deeper
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
