import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Slim offline banner. Reacts to the native `zx:network` event
 * dispatched by `src/lib/native/bootstrap.ts` and, on web, to the
 * standard `online`/`offline` window events.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Initial state — navigator.onLine is best-effort but fine for boot.
    if (typeof navigator !== "undefined" && "onLine" in navigator) {
      setOffline(!navigator.onLine);
    }
    const onNative = (e: Event) => {
      const detail = (e as CustomEvent<{ connected: boolean }>).detail;
      setOffline(!detail?.connected);
    };
    const onWebOffline = () => setOffline(true);
    const onWebOnline = () => setOffline(false);

    window.addEventListener("zx:network", onNative as EventListener);
    window.addEventListener("offline", onWebOffline);
    window.addEventListener("online", onWebOnline);
    return () => {
      window.removeEventListener("zx:network", onNative as EventListener);
      window.removeEventListener("offline", onWebOffline);
      window.removeEventListener("online", onWebOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-b px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em]"
      style={{
        background: "rgba(220, 38, 38, 0.12)",
        color: "#fecaca",
        borderColor: "rgba(220, 38, 38, 0.35)",
        letterSpacing: "0.18em",
      }}
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden />
      <span>Signal lost — working offline</span>
    </div>
  );
}
