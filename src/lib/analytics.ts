/**
 * Lightweight client-side analytics. Batches events to the analytics_events
 * table via a public insert. Fire-and-forget, throttled, never blocks the UI.
 * Table already exists with 5 columns + 2 policies.
 */
import { supabase } from "@/integrations/supabase/client";

type EventName =
  | "screen_view"
  | "post_publish"
  | "post_like"
  | "post_share"
  | "reel_view"
  | "reel_complete"
  | "search"
  | "listing_view"
  | "listing_save"
  | "checkout_start"
  | "ride_start"
  | "drag_start"
  | "sign_in"
  | "sign_out"
  | "error";

type Event = {
  name: EventName;
  props?: Record<string, unknown>;
};

const BUFFER: Array<Event & { at: string; user_id: string | null; session: string }> = [];
const SESSION_KEY = "zrex.analytics.session";
const FLUSH_MS = 5_000;
const MAX_BUFFER = 20;

let session = "";
let userId: string | null = null;
let installed = false;

function getSession(): string {
  if (session) return session;
  if (typeof window === "undefined") return "srv";
  try {
    let s = window.sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem(SESSION_KEY, s);
    }
    session = s;
    return s;
  } catch {
    return "no-storage";
  }
}

async function flush() {
  if (BUFFER.length === 0) return;
  const rows = BUFFER.splice(0, BUFFER.length).map((e) => ({
    event_name: e.name,
    user_id: e.user_id,
    session_id: e.session,
    properties: e.props ?? {},
    created_at: e.at,
  }));
  try {
    await supabase.from("analytics_events").insert(rows);
  } catch {
    // swallow — analytics must never crash the app
  }
}

export function track(name: EventName, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  BUFFER.push({
    name,
    props,
    at: new Date().toISOString(),
    user_id: userId,
    session: getSession(),
  });
  if (BUFFER.length >= MAX_BUFFER) void flush();
}

export function installAnalytics() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  void supabase.auth.getSession().then(({ data }) => {
    userId = data.session?.user.id ?? null;
  });
  supabase.auth.onAuthStateChange((event, sess) => {
    userId = sess?.user.id ?? null;
    if (event === "SIGNED_IN") track("sign_in");
    if (event === "SIGNED_OUT") track("sign_out");
  });

  setInterval(() => void flush(), FLUSH_MS);
  window.addEventListener("pagehide", () => void flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
}
