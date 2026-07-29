/**
 * Push notification registration for native shells.
 * On web this is a no-op; token registration returns null.
 *
 * The token is persisted to the `device_tokens` table (best-effort) so the
 * backend can target this device. Table absence is tolerated — the bridge
 * still works locally and can retry on next launch.
 */
import { supabase } from "@/integrations/supabase/client";
import { isNative, platform } from "./index";
import { loadPlugin } from "./plugins";

let registered = false;


type PushMod = {
  PushNotifications: {
    checkPermissions: () => Promise<{ receive: string }>;
    requestPermissions: () => Promise<{ receive: string }>;
    register: () => Promise<void>;
    addListener: (event: string, cb: (data: unknown) => void) => Promise<unknown>;
  };
};

export async function registerPushNotifications(): Promise<string | null> {
  if (registered || !isNative()) return null;
  const mod = await loadPlugin<PushMod>("@capacitor/push-notifications");
  if (!mod) return null;
  const PN = mod.PushNotifications;

  try {
    let perm = await PN.checkPermissions();
    if (perm.receive !== "granted") perm = await PN.requestPermissions();
    if (perm.receive !== "granted") return null;
  } catch { return null; }

  return new Promise<string | null>((resolve) => {
    let settled = false;
    const done = (token: string | null) => { if (!settled) { settled = true; registered = true; resolve(token); } };

    PN.addListener("registration", async (data: unknown) => {
      const token = (data as { value?: string })?.value ?? null;
      if (token) {
        try {
          const { data: session } = await supabase.auth.getUser();
          const userId = session.user?.id;
          if (userId) {
            await supabase.from("device_tokens" as never).upsert({
              user_id: userId,
              token,
              platform: platform(),
              updated_at: new Date().toISOString(),
            } as never, { onConflict: "token" } as never);
          }
        } catch { /* table may not exist yet */ }
      }
      done(token);
    }).catch(() => done(null));

    PN.addListener("registrationError", () => done(null)).catch(() => done(null));

    PN.addListener("pushNotificationReceived", (n: unknown) => {
      window.dispatchEvent(new CustomEvent("zx:push", { detail: n }));
    }).catch(() => { /* ignore */ });

    PN.addListener("pushNotificationActionPerformed", (n: unknown) => {
      window.dispatchEvent(new CustomEvent("zx:push-tap", { detail: n }));
    }).catch(() => { /* ignore */ });

    PN.register().catch(() => done(null));

    // Safety timeout — some devices never fire registration
    setTimeout(() => done(null), 12000);
  });
}
