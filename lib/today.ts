// Today's calendar date in Ontario (YYYY-MM-DD). toISOString() is UTC, which
// flips to "tomorrow" after ~8 pm Toronto time and would hide today's talk.
export function todayToronto(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}
