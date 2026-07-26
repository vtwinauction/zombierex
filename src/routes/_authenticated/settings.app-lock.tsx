import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  authenticateBiometric,
  checkBiometricAvailability,
  loadAppLockPrefs,
  saveAppLockPrefs,
  type BiometryKind,
} from "@/lib/native/biometric";

export const Route = createFileRoute("/_authenticated/settings/app-lock")({
  head: () => ({ meta: [
    { title: "App Lock · ZOMBIEREX" },
    { name: "description", content: "Require FaceID, TouchID or fingerprint to open ZOMBIEREX." },
    { property: "og:title", content: "App Lock · ZOMBIEREX" },
    { property: "og:description", content: "Require FaceID, TouchID or fingerprint to open ZOMBIEREX." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AppLockPage,
});

const KIND_LABEL: Record<BiometryKind, string> = {
  faceId: "Face ID",
  touchId: "Touch ID",
  fingerprint: "Fingerprint",
  iris: "Iris",
  none: "Device credential",
};

function AppLockPage() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [kind, setKind] = useState<BiometryKind>("none");
  const [reason, setReason] = useState<string | undefined>();
  const [enabled, setEnabled] = useState(false);
  const [graceMs, setGraceMs] = useState(60_000);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const p = loadAppLockPrefs();
    setEnabled(p.enabled);
    setGraceMs(p.graceMs);
    void checkBiometricAvailability().then((r) => {
      setAvailable(r.available);
      setKind(r.kind);
      setReason(r.reason);
    });
  }, []);

  const toggle = async (next: boolean) => {
    setStatus(null);
    if (next) {
      setBusy(true);
      const ok = await authenticateBiometric("Enable App Lock");
      setBusy(false);
      if (!ok) { setStatus("Authentication cancelled. App Lock not enabled."); return; }
    }
    setEnabled(next);
    saveAppLockPrefs({ enabled: next, graceMs });
    setStatus(next ? "App Lock enabled." : "App Lock disabled.");
  };

  const updateGrace = (v: number) => {
    setGraceMs(v);
    saveAppLockPrefs({ enabled, graceMs: v });
  };

  return (
    <div className="pb-24">
      <header className="px-5 pt-6">
        <Link to="/settings" className="mono-tag" style={{ color: "var(--color-titanium)" }}>← Settings</Link>
        <h1 className="serif mt-2 text-4xl leading-tight" style={{ color: "var(--color-ink)" }}>
          App Lock
        </h1>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-silver)" }}>
          Require {KIND_LABEL[kind] || "biometrics"} whenever you open ZOMBIEREX.
        </p>
      </header>

      <div className="mt-6 space-y-3 px-4">
        <section style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)", borderRadius: 10, padding: 16 }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px]" style={{ color: "var(--color-ink)" }}>Enable App Lock</p>
              <p className="mono-tag mt-1" style={{ color: "var(--color-silver)", fontSize: 10 }}>
                {available === null
                  ? "Checking availability…"
                  : available
                    ? `${KIND_LABEL[kind]} available on this device`
                    : `Not available${reason ? ` — ${reason}` : ""}`}
              </p>
            </div>
            <button
              disabled={!available || busy}
              onClick={() => toggle(!enabled)}
              className="tap h-6 w-11 rounded-full transition-colors"
              style={{
                background: enabled ? "var(--color-neon)" : "var(--color-hair-strong)",
                position: "relative",
                opacity: !available || busy ? 0.5 : 1,
              }}
              aria-pressed={enabled}
              aria-label="Toggle App Lock"
            >
              <span style={{
                position: "absolute", top: 2, left: enabled ? 22 : 2, height: 20, width: 20, borderRadius: 999,
                background: "#fff", transition: "left .16s ease",
              }} />
            </button>
          </div>
        </section>

        <section style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)", borderRadius: 10, padding: 16 }}>
          <p className="text-[14px]" style={{ color: "var(--color-ink)" }}>Auto-lock after</p>
          <p className="mono-tag mt-1" style={{ color: "var(--color-silver)", fontSize: 10 }}>
            Time in background before ZOMBIEREX re-locks.
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { label: "Instant", v: 0 },
              { label: "30 s", v: 30_000 },
              { label: "1 min", v: 60_000 },
              { label: "5 min", v: 5 * 60_000 },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => updateGrace(opt.v)}
                className="tap mono-tag rounded px-2 py-2 text-[11px]"
                style={{
                  border: "1px solid " + (graceMs === opt.v ? "var(--color-neon)" : "var(--color-hair-strong)"),
                  color: graceMs === opt.v ? "var(--color-neon)" : "var(--color-ink)",
                  background: "transparent",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {status && (
          <p className="mono-tag px-1" style={{ color: "var(--color-titanium)" }}>{status}</p>
        )}

        <p className="mono-tag mt-2 px-1" style={{ color: "var(--color-silver)", fontSize: 10 }}>
          App Lock protects viewing only. Your account still requires your password for sign-in on new devices.
        </p>
      </div>
    </div>
  );
}
