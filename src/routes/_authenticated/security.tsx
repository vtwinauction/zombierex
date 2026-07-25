import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listDevices,
  registerDevice,
  revokeDevice,
  exportMyData,
  requestAccountDeletion,
} from "@/lib/security.functions";
import { fmtRelative } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({
    meta: [
      { title: "Security Center · ZOMBIEREX" },
      { name: "description", content: "Manage devices, two-factor authentication, and your account data." },
    ],
  }),
  component: SecurityCenter,
});

type Device = { id: string; label: string | null; user_agent: string | null; last_seen_at: string | null; created_at: string };

function SecurityCenter() {
  const callList = useServerFn(listDevices);
  const callRegister = useServerFn(registerDevice);
  const callRevoke = useServerFn(revokeDevice);
  const callExport = useServerFn(exportMyData);
  const callDelete = useServerFn(requestAccountDeletion);

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const list = await callList();
      setDevices(list as Device[]);
      const { data } = await supabase.auth.mfa.listFactors();
      setMfaEnabled(!!data?.totp?.some((f) => f.status === "verified"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Register this device (best-effort) and load state.
    (async () => {
      try { await callRegister({ data: {} }); } catch { /* ignore duplicates */ }
      await refresh();
    })();
  }, []);

  async function onRevoke(id: string) {
    setBusy(id);
    try { await callRevoke({ data: { id } }); await refresh(); } finally { setBusy(null); }
  }

  async function onExport() {
    setBusy("export"); setMsg(null);
    try {
      const blob = await callExport();
      const file = new Blob([JSON.stringify(blob, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zombierex-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Data downloaded.");
    } catch (e: any) {
      setMsg(e?.message ?? "Export failed.");
    } finally { setBusy(null); }
  }

  async function onChangePassword() {
    const p = prompt("Enter a new password (min 8 characters):");
    if (!p || p.length < 8) return;
    setBusy("pw");
    const { error } = await supabase.auth.updateUser({ password: p });
    setBusy(null);
    setMsg(error ? error.message : "Password updated.");
  }

  async function onStartMfa() {
    setBusy("mfa"); setMsg(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setMfaFactorId(data.id);
      setMfaQr(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setMfaEnrolling(true);
    } catch (e: any) {
      setMsg(e?.message ?? "Could not start MFA.");
    } finally { setBusy(null); }
  }

  async function onVerifyMfa() {
    if (!mfaFactorId) return;
    setBusy("mfa-verify");
    try {
      const { data: c, error: e1 } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (e1) throw e1;
      const { error: e2 } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId, challengeId: c.id, code: mfaCode.trim(),
      });
      if (e2) throw e2;
      setMsg("Two-factor enabled.");
      setMfaEnrolling(false); setMfaQr(null); setMfaSecret(null); setMfaCode("");
      await refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "Verification failed.");
    } finally { setBusy(null); }
  }

  async function onDisableMfa() {
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.[0];
    if (!totp) return;
    setBusy("mfa-off");
    const { error } = await supabase.auth.mfa.unenroll({ factorId: totp.id });
    setBusy(null);
    setMsg(error ? error.message : "Two-factor disabled.");
    await refresh();
  }

  async function onDeleteRequest() {
    if (!confirm("Request permanent account deletion? This cannot be undone.")) return;
    setBusy("del");
    try {
      await callDelete({ data: { reason: "user_request" } });
      setMsg("Deletion requested. Our team will process within 30 days.");
    } finally { setBusy(null); }
  }

  return (
    <div style={{ background: "var(--color-cream, #fafaf7)", minHeight: "100vh", color: "var(--color-ink, #0a0a0a)" }}>
      <main className="mx-auto max-w-xl px-4 pb-32 pt-4">
        <div className="mb-4">
          <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ SECURITY CENTER</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Keep your account safe</h1>
          <p className="mt-1 text-sm opacity-70">
            Manage devices, two-factor authentication, and your personal data.
          </p>
        </div>

        {msg && (
          <div className="mb-4 rounded-lg px-3 py-2 text-sm"
               style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)" }}>
            {msg}
          </div>
        )}

        <Section title="Two-factor authentication" hint="Add a one-time code from an authenticator app.">
          {mfaEnabled ? (
            <div className="flex items-center justify-between">
              <span className="text-sm">Enabled</span>
              <button onClick={onDisableMfa} disabled={busy === "mfa-off"} className="tap px-3 py-1.5 text-xs" style={btnGhost}>
                Disable
              </button>
            </div>
          ) : mfaEnrolling ? (
            <div className="space-y-3">
              {mfaQr && (
                <img src={mfaQr} alt="Scan with your authenticator app" width={180} height={180}
                     style={{ background: "#fff", padding: 8, borderRadius: 8 }} />
              )}
              {mfaSecret && (
                <p className="text-[11px] opacity-70">Or enter this key manually: <code>{mfaSecret}</code></p>
              )}
              <input
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                inputMode="numeric"
                placeholder="6-digit code"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)" }}
              />
              <button onClick={onVerifyMfa} disabled={busy === "mfa-verify" || mfaCode.length < 6}
                      className="tap px-3 py-2 text-sm" style={btnPrimary}>
                Verify & enable
              </button>
            </div>
          ) : (
            <button onClick={onStartMfa} disabled={busy === "mfa"} className="tap px-3 py-2 text-sm" style={btnPrimary}>
              {busy === "mfa" ? "Starting…" : "Enable two-factor"}
            </button>
          )}
        </Section>

        <Section title="Password" hint="Use at least 8 characters. Longer is stronger.">
          <button onClick={onChangePassword} disabled={busy === "pw"} className="tap px-3 py-2 text-sm" style={btnPrimary}>
            Change password
          </button>
        </Section>

        <Section title="Active devices" hint="Sign out of any device you don't recognize.">
          {loading ? (
            <p className="text-sm opacity-60">Loading…</p>
          ) : devices.length === 0 ? (
            <p className="text-sm opacity-60">No devices recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {devices.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)" }}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.label ?? "Device"}</p>
                    <p className="truncate text-[11px] opacity-60">
                      {d.user_agent?.slice(0, 60)}
                      {d.last_seen_at && ` · ${fmtRelative(d.last_seen_at)}`}
                    </p>
                  </div>
                  <button onClick={() => onRevoke(d.id)} disabled={busy === d.id}
                          className="tap ml-2 shrink-0 px-2 py-1 text-[11px]" style={btnGhost}>
                    {busy === d.id ? "…" : "Revoke"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Your data" hint="Download a copy of everything you've created.">
          <div className="flex gap-2">
            <button onClick={onExport} disabled={busy === "export"} className="tap px-3 py-2 text-sm" style={btnPrimary}>
              {busy === "export" ? "Preparing…" : "Download my data"}
            </button>
            <a href="/settings" className="tap px-3 py-2 text-sm" style={btnGhost}>Privacy settings</a>
          </div>
        </Section>

        <Section title="Delete account" hint="Removes your profile and content after review. Cannot be undone.">
          <button onClick={onDeleteRequest} disabled={busy === "del"} className="tap px-3 py-2 text-sm"
                  style={{ ...btnGhost, color: "#c53030", borderColor: "#c53030" }}>
            Request account deletion
          </button>
        </Section>
      </main>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: "var(--color-neon)", color: "var(--color-ink)", borderRadius: 8, fontWeight: 600,
};
const btnGhost: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--color-hair)", borderRadius: 8, color: "var(--color-ink)",
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 p-3"
             style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)", borderRadius: 12 }}>
      <p className="mono-tag" style={{ color: "var(--color-silver)" }}>{title.toUpperCase()}</p>
      {hint && <p className="mb-2 mt-0.5 text-[11px] opacity-70">{hint}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}
