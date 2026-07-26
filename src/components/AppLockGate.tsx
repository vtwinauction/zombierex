import { useEffect, useRef, useState } from "react";
import {
  authenticateBiometric,
  loadAppLockPrefs,
  saveAppLockPrefs,
} from "@/lib/native/biometric";
import { supabase } from "@/integrations/supabase/client";

/**
 * Full-screen biometric gate. When app-lock is enabled, blocks the UI
 * on cold start and whenever the app returns to the foreground after the
 * configured grace period.
 */
export function AppLockGate() {
  const [locked, setLocked] = useState<boolean>(() => loadAppLockPrefs().enabled);
  const [busy, setBusy] = useState(false);
  const lastActiveRef = useRef<number>(Date.now());

  const attemptUnlock = async () => {
    setBusy(true);
    const ok = await authenticateBiometric("Unlock your Digital Garage");
    setBusy(false);
    if (ok) setLocked(false);
  };

  // Cold-start unlock prompt.
  useEffect(() => {
    if (!locked) return;
    void attemptUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-lock on foreground after grace period.
  useEffect(() => {
    const onState = (e: Event) => {
      const detail = (e as CustomEvent<{ isActive?: boolean }>).detail;
      const prefs = loadAppLockPrefs();
      if (!prefs.enabled) { setLocked(false); return; }
      if (detail?.isActive === false) {
        lastActiveRef.current = Date.now();
      } else if (detail?.isActive === true) {
        const away = Date.now() - lastActiveRef.current;
        if (away >= prefs.graceMs) {
          setLocked(true);
          void attemptUnlock();
        }
      }
    };
    const onVis = () => {
      const prefs = loadAppLockPrefs();
      if (!prefs.enabled) { setLocked(false); return; }
      if (document.visibilityState === "hidden") {
        lastActiveRef.current = Date.now();
      } else if (document.visibilityState === "visible") {
        const away = Date.now() - lastActiveRef.current;
        if (away >= prefs.graceMs) {
          setLocked(true);
          void attemptUnlock();
        }
      }
    };
    window.addEventListener("zx:appstate", onState as EventListener);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("zx:appstate", onState as EventListener);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!locked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App locked"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "var(--color-obsidian, #08090b)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: 96, height: 96, borderRadius: 999,
          border: "1px solid var(--color-hair-strong, #2a2d33)",
          display: "grid", placeItems: "center",
          boxShadow: "0 0 40px rgba(0,200,83,0.18)",
        }}
      >
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 10V8a6 6 0 1 1 12 0v2" stroke="var(--color-neon, #00c853)" strokeWidth="1.5" />
          <rect x="4" y="10" width="16" height="10" rx="2" stroke="var(--color-ink, #f5f5f5)" strokeWidth="1.5" />
          <circle cx="12" cy="15" r="1.5" fill="var(--color-neon, #00c853)" />
        </svg>
      </div>
      <p className="serif italic" style={{ marginTop: 20, fontSize: 22, color: "var(--color-ink, #f5f5f5)" }}>
        ZOMBIEREX is locked
      </p>
      <p className="mono-tag" style={{ marginTop: 6, color: "var(--color-silver, #9aa0a6)" }}>
        Authenticate to continue
      </p>
      <button
        onClick={attemptUnlock}
        disabled={busy}
        className="tap"
        style={{
          marginTop: 28, padding: "12px 22px", borderRadius: 999,
          background: "var(--color-neon, #00c853)", color: "#00140a",
          fontWeight: 600, letterSpacing: 0.4, opacity: busy ? 0.7 : 1,
          minWidth: 180,
        }}
      >
        {busy ? "Verifying…" : "Unlock"}
      </button>
      {/* Escape hatches — prevent permanent lockout if biometrics fail
          (e.g. plugin unavailable, hardware broken, credential missing). */}
      <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
        <button
          onClick={() => {
            saveAppLockPrefs({ ...loadAppLockPrefs(), enabled: false });
            setLocked(false);
          }}
          className="tap"
          style={{
            padding: "10px 16px", borderRadius: 999, fontSize: 12,
            background: "transparent", color: "var(--color-silver, #9aa0a6)",
            border: "1px solid var(--color-hair-strong, #2a2d33)",
          }}
        >
          Disable app lock
        </button>
        <button
          onClick={async () => {
            try { await supabase.auth.signOut(); } catch { /* ignore */ }
            saveAppLockPrefs({ ...loadAppLockPrefs(), enabled: false });
            setLocked(false);
            try { window.location.assign("/auth"); } catch { /* ignore */ }
          }}
          className="tap"
          style={{
            padding: "10px 16px", borderRadius: 999, fontSize: 12,
            background: "transparent", color: "var(--color-silver, #9aa0a6)",
            border: "1px solid var(--color-hair-strong, #2a2d33)",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
