import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Mic, MicOff, Volume2, ShieldAlert, Radio } from "lucide-react";
import { BUILTIN_COMMANDS, HeyRex, type RexStatus } from "@/lib/hey-rex";
import { speak, isSpeechSupported } from "@/lib/voice";

export const Route = createFileRoute("/_authenticated/atlas/voice")({
  head: () => ({
    meta: [
      { title: "Hey Rex — Voice Commands" },
      {
        name: "description",
        content: "Hands-free voice control for Zombierex. Say 'Hey Rex' to start.",
      },
      { property: "og:title", content: "Hey Rex — Voice Commands" },
      {
        property: "og:description",
        content: "Wake-word voice control for navigation, fuel, SOS, and Ride Mode.",
      },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  const nav = useNavigate();
  const [status, setStatus] = useState<RexStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [last, setLast] = useState<string | null>(null);
  const [awake, setAwake] = useState(false);
  const rexRef = useRef<HeyRex | null>(null);

  const rex = useMemo(() => {
    const r = new HeyRex({
      navigate: (to) => nav({ to: to as any }),
      speak: (t) => speak(t),
    });
    return r;
  }, [nav]);

  useEffect(() => {
    rexRef.current = rex;
    const off = rex.onChange((s) => {
      setStatus(s.status);
      setTranscript(s.transcript);
      setLast(s.lastCommand);
      setAwake(s.awake);
    });
    return () => {
      off();
      rex.stop();
    };
  }, [rex]);

  const supported = rex.isSupported();
  const active = status === "listening" || status === "wake";

  const toggle = () => {
    if (active) rex.stop();
    else rex.start();
  };

  return (
    <div className="min-h-svh bg-background text-foreground pb-24">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            to="/atlas"
            className="tap grid h-10 w-10 place-items-center rounded-full border border-border"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest opacity-60">
              Atlas / Voice
            </div>
            <h1 className="text-xl font-black tracking-tight">Hey Rex</h1>
          </div>
        </div>
      </header>

      <div className="px-4 pt-6">
        <div className="rounded-3xl border border-border p-6 bg-card">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={toggle}
              disabled={!supported}
              aria-label={active ? "Stop listening" : "Start listening"}
              className="tap relative grid h-32 w-32 place-items-center rounded-full shadow-xl transition"
              style={{
                background: active ? "var(--color-neon)" : "var(--color-obsidian, #0f1115)",
                color: active ? "var(--color-obsidian, #0f1115)" : "#fff",
              }}
            >
              {active ? (
                <Mic size={44} strokeWidth={2.4} />
              ) : (
                <MicOff size={44} strokeWidth={2.4} />
              )}
              {awake && (
                <span
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: "var(--color-neon)", opacity: 0.35 }}
                />
              )}
            </button>
            <div className="text-center">
              <div className="text-xs font-mono uppercase tracking-widest opacity-60">
                {!supported
                  ? "Unsupported browser"
                  : status === "denied"
                    ? "Microphone blocked"
                    : status === "wake"
                      ? "Listening for command…"
                      : status === "listening"
                        ? "Standby — say 'Hey Rex'"
                        : status === "error"
                          ? "Mic error"
                          : "Tap to activate"}
              </div>
              <div className="text-sm mt-1 min-h-[1.25rem] opacity-80">{transcript || "…"}</div>
              {last && <div className="text-xs mt-2 font-mono opacity-70">✓ {last}</div>}
            </div>
          </div>
        </div>

        {!supported && (
          <div className="mt-4 rounded-2xl border border-border p-4 flex gap-3 items-start bg-card">
            <ShieldAlert size={18} className="mt-0.5 opacity-70" />
            <div className="text-sm opacity-80">
              Voice recognition isn't available in this browser. Use Chrome, Edge, or Android
              WebView. iOS Safari doesn't expose SpeechRecognition — tap commands still work below.
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Radio size={14} className="opacity-60" />
            <div className="text-[10px] font-mono uppercase tracking-widest opacity-60">
              Command Library
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BUILTIN_COMMANDS.map((c) => (
              <button
                key={c.id}
                onClick={() =>
                  c.action({ navigate: (to) => nav({ to: to as any }), speak: (t) => speak(t) })
                }
                className="tap text-left rounded-xl border border-border bg-card px-3 py-3 hover:border-foreground/40 transition"
              >
                <div className="text-sm font-semibold">{c.label}</div>
                <div className="text-[11px] font-mono opacity-60 truncate">"{c.phrases[0]}"</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 size={14} className="opacity-60" />
            <div className="text-[10px] font-mono uppercase tracking-widest opacity-60">
              How it works
            </div>
          </div>
          <ol className="text-sm opacity-80 space-y-1.5 list-decimal list-inside">
            <li>Tap the mic. Grant microphone permission.</li>
            <li>
              Say <b>"Hey Rex"</b> — the ring pulses green when awake.
            </li>
            <li>
              Follow with a command like <i>"find fuel"</i>, <i>"start ride"</i>, or{" "}
              <i>"emergency"</i>.
            </li>
            <li>Wake window lasts 8 seconds; runs continuously in the background.</li>
          </ol>
          {!isSpeechSupported() && (
            <div className="text-xs mt-3 opacity-60">
              Voice feedback (text-to-speech) is unavailable on this device.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
