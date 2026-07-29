/**
 * Static registry of Capacitor plugin loaders.
 *
 * Why not `import(name)` with a variable specifier: the app ships the same
 * web bundle inside the native WebView, and a bare specifier cannot be
 * resolved at runtime there. A variable import therefore ALWAYS throws —
 * which our try/catch swallowed, making every native feature silently
 * no-op on device.
 *
 * Static import expressions let Vite pre-bundle each plugin into its own
 * lazy chunk, so the loader resolves for real on iOS/Android while staying
 * out of the initial web payload.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const REGISTRY: Record<string, () => Promise<any>> = {
  "@capacitor/app": () => import("@capacitor/app"),
  "@capacitor/browser": () => import("@capacitor/browser"),
  "@capacitor/camera": () => import("@capacitor/camera"),
  "@capacitor/device": () => import("@capacitor/device"),
  "@capacitor/geolocation": () => import("@capacitor/geolocation"),
  "@capacitor/haptics": () => import("@capacitor/haptics"),
  "@capacitor/keyboard": () => import("@capacitor/keyboard"),
  "@capacitor/network": () => import("@capacitor/network"),
  "@capacitor/push-notifications": () => import("@capacitor/push-notifications"),
  "@capacitor/share": () => import("@capacitor/share"),
  "@capacitor/splash-screen": () => import("@capacitor/splash-screen"),
  "@capacitor/status-bar": () => import("@capacitor/status-bar"),
  "@aparajita/capacitor-biometric-auth": () => import("@aparajita/capacitor-biometric-auth"),
};

export type PluginName = keyof typeof REGISTRY;

/** Load a Capacitor plugin module, or null when it is unavailable. */
export async function loadPlugin<T = any>(name: string): Promise<T | null> {
  const load = REGISTRY[name];
  if (!load) return null;
  try {
    return (await load()) as T;
  } catch {
    return null;
  }
}
