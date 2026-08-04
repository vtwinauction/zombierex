/**
 * Native bridge — thin wrappers around Capacitor plugins with graceful
 * web fallbacks. Import from anywhere; on the web these become no-ops or
 * Web-standards equivalents (navigator.share, navigator.vibrate, etc.).
 *
 * Rule: never `import` a plugin at module scope — that pulls the native
 * binding into the web bundle. Always dynamic-import inside the function
 * body, guarded by isNative().
 *
 * The plugin specifiers are loaded via a variable so TypeScript does not
 * try to resolve the native-only packages during web typecheck / SSR
 * prerender. They are only ever evaluated on a real device.
 */
import { Capacitor } from "@capacitor/core";
import { loadPlugin } from "./plugins";

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function platform(): "ios" | "android" | "web" {
  try {
    const p = Capacitor.getPlatform();
    return p === "ios" || p === "android" ? p : "web";
  } catch {
    return "web";
  }
}

/* -------------------------------------------------- Haptics */

export async function haptic(
  kind: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light",
) {
  if (isNative()) {
    const mod = await loadPlugin<{
      Haptics: {
        impact: (o: { style: unknown }) => Promise<void>;
        notification: (o: { type: unknown }) => Promise<void>;
      };
      ImpactStyle: Record<string, unknown>;
      NotificationType: Record<string, unknown>;
    }>("@capacitor/haptics");
    if (mod) {
      try {
        const { Haptics, ImpactStyle, NotificationType } = mod;
        if (kind === "success" || kind === "warning" || kind === "error") {
          const map = {
            success: NotificationType.Success,
            warning: NotificationType.Warning,
            error: NotificationType.Error,
          };
          await Haptics.notification({ type: map[kind] });
        } else {
          const map = {
            light: ImpactStyle.Light,
            medium: ImpactStyle.Medium,
            heavy: ImpactStyle.Heavy,
          };
          await Haptics.impact({ style: map[kind] });
        }
        return;
      } catch {
        /* fall through */
      }
    }
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const ms = kind === "heavy" ? 30 : kind === "medium" ? 18 : 10;
    try {
      navigator.vibrate(ms);
    } catch {
      /* ignore */
    }
  }
}

/* -------------------------------------------------- Share */

export type ShareInput = { title?: string; text?: string; url?: string; dialogTitle?: string };

export async function share(input: ShareInput): Promise<{ ok: boolean }> {
  if (isNative()) {
    const mod = await loadPlugin<{ Share: { share: (o: ShareInput) => Promise<void> } }>(
      "@capacitor/share",
    );
    if (mod) {
      try {
        await mod.Share.share(input);
        return { ok: true };
      } catch {
        return { ok: false };
      }
    }
  }
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await (navigator as Navigator).share({
        title: input.title,
        text: input.text,
        url: input.url,
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
  if (input.url && typeof navigator !== "undefined" && "clipboard" in navigator) {
    try {
      await (navigator as Navigator).clipboard.writeText(input.url);
      return { ok: true };
    } catch {
      /* ignore */
    }
  }
  return { ok: false };
}

/* -------------------------------------------------- External browser */

export async function openExternal(url: string) {
  if (isNative()) {
    const mod = await loadPlugin<{
      Browser: { open: (o: { url: string; presentationStyle?: string }) => Promise<void> };
    }>("@capacitor/browser");
    if (mod) {
      try {
        await mod.Browser.open({ url, presentationStyle: "popover" });
        return;
      } catch {
        /* fall through */
      }
    }
  }
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}

/* -------------------------------------------------- Network status */

export async function getNetworkStatus() {
  if (isNative()) {
    const mod = await loadPlugin<{
      Network: { getStatus: () => Promise<{ connected: boolean; connectionType: string }> };
    }>("@capacitor/network");
    if (mod) {
      try {
        return await mod.Network.getStatus();
      } catch {
        /* fall through */
      }
    }
  }
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  return { connected: online, connectionType: online ? "unknown" : "none" };
}

/* -------------------------------------------------- Device info */

export async function getDeviceInfo() {
  if (isNative()) {
    const mod = await loadPlugin<{ Device: { getInfo: () => Promise<Record<string, unknown>> } }>(
      "@capacitor/device",
    );
    if (mod) {
      try {
        return await mod.Device.getInfo();
      } catch {
        /* fall through */
      }
    }
  }
  return {
    platform: "web" as const,
    operatingSystem: "unknown",
    osVersion: "",
    manufacturer: "",
    model: typeof navigator !== "undefined" ? navigator.userAgent : "",
    isVirtual: false,
  };
}
