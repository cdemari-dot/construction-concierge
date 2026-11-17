"use client";

import { useEffect, useRef, useState } from "react";
import { speak, stopSpeaking } from "@/lib/voice";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How much should I be saving each week?",
  "Which jobs are losing money?",
  "What invoices are overdue?",
  "Can I make payroll for the next 6 weeks?",
  "What change orders need a follow-up?",
];

export function AgentDrawer() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const voiceOnRef = useRef(true);

  useEffect(() => {
    // Restore the saved preference after mount (async callback keeps SSR output stable).
    const raf = requestAnimationFrame(() => {
      try {
        if (localStorage.getItem("cc-voice") === "off") {
          setVoiceOn(false);
          voiceOnRef.current = false;
        }
      } catch {}
    });
    // Chrome loads voices lazily; touching the list early makes the first reply use the right voice.
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    return () => {
      cancelAnimationFrame(raf);
      stopSpeaking();
    };
  }, []);

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    voiceOnRef.current = next;
    if (!next) stopSpeaking();
    try {
      localStorage.setItem("cc-voice", next ? "on" : "off");
    } catch {}
  }

  function listen() {
    type Rec = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void; start: () => void; stop: () => void };
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Voice input isn't supported in this browser. Try Chrome or Safari.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    stopSpeaking();
    const rec = new Ctor();
    rec.lang = "en-CA";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      if (text) send(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      setError("Couldn't hear that. Check the microphone permission and try again.");
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Agent failed");
      setMessages([...next, { role: "assistant", content: body.reply }]);
      if (voiceOnRef.current) speak(body.reply);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-label="Open AI agent"
        className="cc-agent-fab"
        style={{
          position: "fixed",
          right: 22,
          bottom: 22,
          zIndex: 40,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: 0,
          background: "var(--text)",
          boxShadow: "0 14px 34px rgba(0,0,0,.28)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "transparent",
            display: "grid",
            placeItems: "center",
            color: "var(--bg)",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: ".06em",
          }}
        >
          AI
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            height: "100vh",
            width: "min(420px, 100vw)",
            zIndex: 60,
            background: "var(--glass)",
            borderLeft: "1px solid var(--line2)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
            <b className="display">CFO Agent</b>
            <span style={{ flex: 1 }} />
            <button className="cc-btn ghost sm" onClick={toggleVoice} type="button" aria-pressed={voiceOn} title="Speak replies aloud">
              {voiceOn ? "Voice on" : "Voice off"}
            </button>
            <button
              className="cc-btn ghost sm"
              onClick={() => {
                stopSpeaking();
                setOpen(false);
              }}
              type="button"
            >
              Close
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="cc-btn ghost sm" onClick={() => send(s)} type="button" style={{ textAlign: "left" }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  padding: "10px 13px",
                  borderRadius: 14,
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  background: m.role === "user" ? "rgba(200,164,100,.14)" : "var(--panel2)",
                  border: `1px solid ${m.role === "user" ? "rgba(200,164,100,.3)" : "var(--line2)"}`,
                }}
              >
                {m.content}
              </div>
            ))}
            {busy && <div style={{ color: "var(--mute)", fontSize: 12.5 }}>Thinking…</div>}
            {error && <div style={{ color: "var(--red)", fontSize: 12.5 }}>{error}</div>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            style={{ display: "flex", gap: 8, padding: "12px 14px 16px", borderTop: "1px solid var(--line)" }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about cash, jobs, invoices…"
              style={{
                flex: 1,
                resize: "none",
                background: "var(--panel)",
                border: "1px solid var(--line2)",
                borderRadius: 12,
                color: "var(--text)",
                padding: "10px 12px",
                fontFamily: "inherit",
                fontSize: 13.5,
                height: 46,
              }}
            />
            <button
              className="cc-btn ghost"
              type="button"
              onClick={listen}
              aria-label={listening ? "Stop listening" : "Speak your question"}
              style={{ fontSize: 18, borderColor: listening ? "var(--red)" : undefined }}
            >
              {listening ? "Stop" : "Mic"}
            </button>
            <button className="cc-btn lime" type="submit" disabled={busy}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
