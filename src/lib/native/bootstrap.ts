/**
 * Native shell bootstrap — call once from the root component's useEffect.
 * Safe on web (all calls guarded by isNative()).
 *
 * Plugin specifiers are loaded via variable strings so TypeScript does
 * not try to resolve the native-only packages during web typecheck.
 */
import type { Router } from "@tanstack/react-router";
import { isNative, platform } from "./index";
import { loadPlugin } from "./plugins";

let started = false;


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function bootstrapNative(router: Router<any, any>) {
  if (started) return;
  started = true;
  if (!isNative()) return;

  // Install navigator.geolocation shim first so any early consumers use it.
  try {
    const { installGeolocationBridge } = await import("./geolocation-bridge");
    await installGeolocationBridge();
  } catch { /* ignore */ }

  // Register for push notifications (best-effort, non-blocking).
  try {
    const { registerPushNotifications } = await import("./push");
    void registerPushNotifications();
  } catch { /* ignore */ }

  // Splash screen
  const splash = await loadPlugin<{ SplashScreen: { hide: (o?: { fadeOutDuration?: number }) => Promise<void> } }>("@capacitor/splash-screen");
  try { await splash?.SplashScreen.hide({ fadeOutDuration: 250 }); } catch { /* ignore */ }


  // Status bar theming
  const sb = await loadPlugin<{
    StatusBar: {
      setStyle: (o: { style: unknown }) => Promise<void>;
      setBackgroundColor: (o: { color: string }) => Promise<void>;
      setOverlaysWebView: (o: { overlay: boolean }) => Promise<void>;
    };
    Style: Record<string, unknown>;
  }>("@capacitor/status-bar");
  if (sb) {
    try {
      await sb.StatusBar.setStyle({ style: sb.Style.Dark });
      if (platform() === "android") {
        await sb.StatusBar.setBackgroundColor({ color: "#08090b" });
        await sb.StatusBar.setOverlaysWebView({ overlay: false });
      }
    } catch { /* ignore */ }
  }

  // App lifecycle + Android back button + deep links
  const appMod = await loadPlugin<{
    App: {
      addListener: (event: string, cb: (data: { isActive?: boolean; url?: string }) => void | Promise<void>) => Promise<unknown>;
      exitApp: () => Promise<void>;
      getLaunchUrl?: () => Promise<{ url?: string } | null>;
    };
  }>("@capacitor/app");
  if (appMod) {
    try {
      await appMod.App.addListener("backButton", async () => {
        if (window.history.length > 1) router.history.back();
        else { try { await appMod.App.exitApp(); } catch { /* ignore */ } }
      });
      await appMod.App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } }
        window.dispatchEvent(new CustomEvent("zx:appstate", { detail: { isActive } }));
      });
      // Universal / custom-scheme deep link handling — normalize to in-app path.
      const handleUrl = (raw?: string) => {
        if (!raw) return;
        try {
          const u = new URL(raw);
          const path = (u.pathname || "/") + (u.search || "") + (u.hash || "");
          if (path && path !== window.location.pathname + window.location.search) {
            router.navigate({ to: path });
          }
        } catch { /* ignore malformed */ }
      };
      await appMod.App.addListener("appUrlOpen", (data) => handleUrl(data.url));
      try {
        const launch = await appMod.App.getLaunchUrl?.();
        handleUrl(launch?.url);
      } catch { /* ignore */ }
    } catch { /* ignore */ }
  }

  // Network status → CSS class + custom event for offline UI
  const net = await loadPlugin<{
    Network: {
      addListener: (event: string, cb: (status: { connected: boolean; connectionType?: string }) => void) => Promise<unknown>;
      getStatus: () => Promise<{ connected: boolean; connectionType?: string }>;
    };
  }>("@capacitor/network");
  if (net) {
    try {
      const applyStatus = (s: { connected: boolean; connectionType?: string }) => {
        document.documentElement.classList.toggle("zx-offline", !s.connected);
        window.dispatchEvent(new CustomEvent("zx:network", { detail: s }));
      };
      applyStatus(await net.Network.getStatus());
      await net.Network.addListener("networkStatusChange", applyStatus);
    } catch { /* ignore */ }
  }


  // Keyboard height CSS var
  const kb = await loadPlugin<{
    Keyboard: { addListener: (event: string, cb: (info: { keyboardHeight: number }) => void) => Promise<unknown> };
  }>("@capacitor/keyboard");
  if (kb) {
    try {
      await kb.Keyboard.addListener("keyboardWillShow", (info) => {
        document.documentElement.style.setProperty("--kb-h", `${info.keyboardHeight}px`);
        document.documentElement.classList.add("kb-open");
      });
      await kb.Keyboard.addListener("keyboardWillHide", () => {
        document.documentElement.style.setProperty("--kb-h", "0px");
        document.documentElement.classList.remove("kb-open");
      });
    } catch { /* ignore */ }
  }
}
