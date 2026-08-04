// Client-side crash reporter — captures unhandled errors and forwards them to
// the crash_reports table via a server function. Silent, throttled, no-op on
// server side and inside dev overlays.
import { submitCrashReport } from "./crash.functions";
import { supabase } from "@/integrations/supabase/client";

type Payload = {
  message: string;
  stack?: string;
  route?: string;
  mechanism?: string;
  context?: Record<string, unknown>;
};

const SEEN = new Map<string, number>();
const DEDUP_MS = 60_000;
const MAX_PER_MINUTE = 5;
let sentThisMinute = 0;
let minuteStart = Date.now();

function throttled(key: string): boolean {
  const now = Date.now();
  if (now - minuteStart > 60_000) {
    minuteStart = now;
    sentThisMinute = 0;
  }
  if (sentThisMinute >= MAX_PER_MINUTE) return true;
  const last = SEEN.get(key) ?? 0;
  if (now - last < DEDUP_MS) return true;
  SEEN.set(key, now);
  sentThisMinute++;
  return false;
}

function serializeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: error.message, stack: error.stack };
  if (error instanceof Response) return { message: `Response ${error.status} ${error.url}` };
  if (typeof error === "string") return { message: error };
  try {
    return { message: JSON.stringify(error).slice(0, 500) };
  } catch {
    return { message: String(error) };
  }
}

export async function reportCrash(error: unknown, extra: Partial<Payload> = {}) {
  if (typeof window === "undefined") return;
  const { message, stack } = serializeError(error);
  const key = `${message}|${(stack ?? "").slice(0, 200)}`;
  if (throttled(key)) return;

  let userId: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    userId = data.session?.user.id;
  } catch {}

  const payload = {
    message,
    stack,
    route: window.location.pathname,
    userAgent: navigator.userAgent.slice(0, 500),
    platform:
      (window as { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.() ??
      "web",
    appVersion: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "dev",
    mechanism: extra.mechanism ?? "manual",
    userId,
    context: extra.context ?? {},
  };

  try {
    await submitCrashReport({ data: payload });
  } catch {
    // swallow — never let the reporter itself crash
  }
}

let installed = false;
export function installCrashReporter() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    void reportCrash(event.error ?? event.message, {
      mechanism: "onerror",
      context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    void reportCrash(event.reason, { mechanism: "unhandledrejection" });
  });
}
