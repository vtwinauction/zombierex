/**
 * "Hey Rex" — hands-free voice command engine.
 * Uses Web Speech API (SpeechRecognition) with continuous listening + wake word.
 * Safe no-op on unsupported browsers (iOS Safari lacks SpeechRecognition).
 */
import { speak } from "./voice";

export type RexCommand = {
  id: string;
  phrases: string[];
  label: string;
  action: (ctx: RexContext) => void | Promise<void>;
};

export type RexContext = {
  navigate: (to: string) => void;
  speak: (text: string) => void;
};

export type RexStatus = "idle" | "listening" | "wake" | "unsupported" | "denied" | "error";

type Listener = (state: {
  status: RexStatus;
  transcript: string;
  lastCommand: string | null;
  awake: boolean;
}) => void;

const WAKE_WORDS = ["hey rex", "hi rex", "hey wrecks", "hey rax", "rex"];
const WAKE_TIMEOUT_MS = 8000;

export const BUILTIN_COMMANDS: RexCommand[] = [
  {
    id: "home",
    label: "Go home",
    phrases: ["home", "go home", "feed"],
    action: (c) => c.navigate("/"),
  },
  {
    id: "atlas",
    label: "Open Atlas",
    phrases: ["atlas", "open atlas", "map", "open map"],
    action: (c) => c.navigate("/atlas"),
  },
  {
    id: "ride",
    label: "Start Ride Mode",
    phrases: ["start ride", "ride mode", "start riding", "let's ride"],
    action: (c) => c.navigate("/atlas/ride"),
  },
  {
    id: "record",
    label: "Record ride",
    phrases: ["record ride", "start recording", "record"],
    action: (c) => c.navigate("/atlas/record"),
  },
  {
    id: "fuel",
    label: "Find fuel",
    phrases: ["find fuel", "fuel", "gas station", "petrol", "nearest fuel"],
    action: (c) => c.navigate("/atlas/fuel"),
  },
  {
    id: "group",
    label: "Group ride",
    phrases: ["group ride", "open group", "my group"],
    action: (c) => c.navigate("/atlas/group"),
  },
  {
    id: "sos",
    label: "Emergency SOS",
    phrases: ["emergency", "sos", "help me", "call sos"],
    action: (c) => {
      c.speak("Opening emergency");
      c.navigate("/atlas/sos");
    },
  },
  {
    id: "messages",
    label: "Messages",
    phrases: ["messages", "open messages", "inbox"],
    action: (c) => c.navigate("/messages"),
  },
  {
    id: "profile",
    label: "Profile",
    phrases: ["profile", "my profile", "my garage"],
    action: (c) => c.navigate("/profile"),
  },
  {
    id: "rewards",
    label: "Rewards",
    phrases: ["rewards", "xp", "achievements"],
    action: (c) => c.navigate("/rewards"),
  },
  {
    id: "settings",
    label: "Settings",
    phrases: ["settings", "open settings"],
    action: (c) => c.navigate("/settings"),
  },
  {
    id: "assistant",
    label: "Ask Rex AI",
    phrases: ["assistant", "ask rex", "open assistant"],
    action: (c) => c.navigate("/assistant"),
  },
];

function normalize(t: string) {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripWake(t: string) {
  const s = normalize(t);
  for (const w of WAKE_WORDS) {
    if (s.startsWith(w)) return s.slice(w.length).trim();
  }
  return s;
}

function containsWake(t: string) {
  const s = normalize(t);
  return WAKE_WORDS.some((w) => s.includes(w));
}

function matchCommand(text: string, commands: RexCommand[]): RexCommand | null {
  const t = normalize(text);
  if (!t) return null;
  // exact/startsWith preferred
  for (const c of commands)
    for (const p of c.phrases)
      if (t === p || t.startsWith(p + " ") || t.endsWith(" " + p)) return c;
  for (const c of commands) for (const p of c.phrases) if (t.includes(p)) return c;
  return null;
}

export class HeyRex {
  private rec: any = null;
  private listeners = new Set<Listener>();
  private commands: RexCommand[];
  private ctx: RexContext;
  private awake = false;
  private wakeTimer: any = null;
  private manualStop = false;
  private status: RexStatus = "idle";
  private transcript = "";
  private lastCommand: string | null = null;

  constructor(ctx: RexContext, commands: RexCommand[] = BUILTIN_COMMANDS) {
    this.ctx = ctx;
    this.commands = commands;
  }

  isSupported() {
    if (typeof window === "undefined") return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  onChange(fn: Listener) {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  private snapshot() {
    return {
      status: this.status,
      transcript: this.transcript,
      lastCommand: this.lastCommand,
      awake: this.awake,
    };
  }
  private emit() {
    for (const l of this.listeners) l(this.snapshot());
  }

  private setStatus(s: RexStatus) {
    this.status = s;
    this.emit();
  }
  private setAwake(v: boolean) {
    this.awake = v;
    if (this.wakeTimer) {
      clearTimeout(this.wakeTimer);
      this.wakeTimer = null;
    }
    if (v)
      this.wakeTimer = setTimeout(() => {
        this.awake = false;
        this.emit();
      }, WAKE_TIMEOUT_MS);
    this.emit();
  }

  start() {
    if (!this.isSupported()) {
      this.setStatus("unsupported");
      return;
    }
    if (this.rec) return;
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onstart = () => this.setStatus("listening");
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") this.setStatus("denied");
      else if (e.error === "no-speech" || e.error === "aborted") {
        /* ignore */
      } else this.setStatus("error");
    };
    rec.onend = () => {
      if (!this.manualStop) {
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      } else this.setStatus("idle");
    };
    rec.onresult = (evt: any) => {
      let interim = "";
      let finalText = "";
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        const r = evt.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      const text = (finalText || interim).trim();
      this.transcript = text;
      this.emit();

      if (!this.awake && containsWake(text)) {
        this.setAwake(true);
        this.setStatus("wake");
        speak("Yes?", { rate: 1.1 });
      }

      if (finalText) {
        const payload = this.awake
          ? stripWake(finalText)
          : containsWake(finalText)
            ? stripWake(finalText)
            : "";
        if (payload) {
          const cmd = matchCommand(payload, this.commands);
          if (cmd) {
            this.lastCommand = cmd.label;
            this.setAwake(false);
            this.setStatus("listening");
            try {
              cmd.action(this.ctx);
            } catch {
              /* ignore */
            }
          } else if (this.awake) {
            speak("I didn't catch that.");
          }
        }
      }
    };
    this.rec = rec;
    this.manualStop = false;
    try {
      rec.start();
    } catch {
      /* ignore */
    }
  }

  stop() {
    this.manualStop = true;
    if (this.wakeTimer) {
      clearTimeout(this.wakeTimer);
      this.wakeTimer = null;
    }
    this.awake = false;
    try {
      this.rec?.stop();
    } catch {
      /* ignore */
    }
    this.rec = null;
    this.setStatus("idle");
  }

  triggerByLabel(label: string) {
    const c = this.commands.find((x) => x.label === label);
    if (c) c.action(this.ctx);
  }
}
