/**
 * Push permission priming sheet — shown once, ~30s after first sign-in, to
 * explain why we want push access BEFORE we trigger the OS prompt. Apple
 * strongly recommends this pattern; skipping it burns the permission prompt.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "zrex.push.primer.v1"; // "shown" | "accepted" | "declined"
const DELAY_MS = 30_000;

async function requestNative(): Promise<boolean> {
  try {
    const mod = (await import("@/lib/native/push")) as {
      registerPushNotifications?: () => Promise<unknown>;
    };
    if (typeof mod.registerPushNotifications === "function") {
      const result = await mod.registerPushNotifications();
      // Function returns a token string on success, null on failure.
      return result != null && result !== false;
    }
  } catch {}
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    try {
      const r = await Notification.requestPermission();
      return r === "granted";
    } catch {}
  }
  return false;
}

export function PushPrimer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) return;
      timer = setTimeout(() => setOpen(true), DELAY_MS);
    });
    return () => timer && clearTimeout(timer);
  }, []);

  if (!open) return null;

  const dismiss = (state: "accepted" | "declined") => {
    localStorage.setItem(KEY, state);
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md p-6"
        style={{
          background: "var(--color-obsidian)",
          borderTop: "1px solid var(--color-hair-strong)",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        }}
      >
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ STAY IN THE LOOP
        </p>
        <h2 className="serif mt-2 text-3xl leading-tight" style={{ color: "var(--color-ink)" }}>
          Get notified{" "}
          <span className="italic" style={{ color: "var(--color-neon)" }}>
            the moment it matters
          </span>
        </h2>
        <ul className="mt-4 space-y-2 text-[13px]" style={{ color: "var(--color-silver)" }}>
          <li>• Group ride check-ins and SOS alerts</li>
          <li>• Direct messages and mentions</li>
          <li>• Judge results, drag verifications, marketplace offers</li>
        </ul>
        <p className="mt-3 text-[11px]" style={{ color: "var(--color-silver)" }}>
          You can fine-tune every category later in Settings → Notifications.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={async () => {
              await requestNative();
              dismiss("accepted");
            }}
            className="btn-solid flex-1"
          >
            Enable notifications
          </button>
          <button onClick={() => dismiss("declined")} className="btn-ghost">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
