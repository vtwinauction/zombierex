import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SettingsScreen, Card, Field, TextInput, PrimaryButton, GhostButton } from "@/components/SettingsScreen";
import { confirmDialog } from "@/lib/confirm";

export const Route = createFileRoute("/_authenticated/settings/twofa")({
  head: () => ({ meta: [{ title: "Two-step verification · Settings · ZOMBIEREX" }, { name: "description", content: "Add an extra layer of security when signing in with an authenticator app." }] }),
  component: TwoFAPage,
});

function TwoFAPage() {
  const [factors, setFactors] = useState<any[]>([]);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  };
  useEffect(() => { load(); }, []);

  const start = async () => {
    setErr(null); setMsg(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) { setErr(error.message); return; }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };
  const verify = async () => {
    if (!enroll) return;
    setErr(null);
    const { data: ch, error: ce } = await supabase.auth.mfa.challenge({ factorId: enroll.id });
    if (ce) { setErr(ce.message); return; }
    const { error: ve } = await supabase.auth.mfa.verify({ factorId: enroll.id, challengeId: ch.id, code });
    if (ve) { setErr(ve.message); return; }
    setEnroll(null); setCode(""); setMsg("Two-step verification enabled."); load();
  };
  const remove = async (id: string) => {
    if (!(await confirmDialog({ title: "Disable two-step verification?", destructive: true, confirmLabel: "Disable" }))) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) setErr(error.message); else load();
  };

  return (
    <SettingsScreen index="06.06" section="2FA" title="Two-step verification" subtitle="Use an authenticator app like 1Password, Authy or Google Authenticator.">
      <div className="space-y-3">
        {factors.length > 0 && (
          <Card>
            {factors.map((f) => (
              <div key={f.id} className="flex items-center justify-between">
                <div>
                  <p className="text-[14px]" style={{ color: "var(--color-ink)" }}>{f.friendly_name || "Authenticator app"}</p>
                  <p className="mono-tag mt-0.5" style={{ color: "var(--color-silver)", fontSize: 10 }}>
                    {f.status === "verified" ? "ACTIVE" : "PENDING"}
                  </p>
                </div>
                <button onClick={() => remove(f.id)} className="mono-tag tap px-3 py-1.5 rounded-full"
                  style={{ border: "1px solid rgba(255,80,80,0.5)", color: "#ff8080" }}>Remove</button>
              </div>
            ))}
          </Card>
        )}

        {!enroll && factors.every((f) => f.status !== "verified") && (
          <PrimaryButton onClick={start}>Set up authenticator app</PrimaryButton>
        )}

        {enroll && (
          <Card>
            <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>Scan the QR code</p>
            <img src={enroll.qr} alt="MFA QR code" className="mx-auto rounded-md bg-white p-2" width={200} height={200} />
            <p className="mono-tag mt-3 break-all text-center" style={{ color: "var(--color-silver)" }}>{enroll.secret}</p>
            <div className="mt-4 space-y-3">
              <Field label="6-digit code">
                <TextInput inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
              </Field>
              <PrimaryButton onClick={verify} disabled={code.length !== 6}>Verify & enable</PrimaryButton>
              <GhostButton onClick={() => setEnroll(null)}>Cancel</GhostButton>
            </div>
          </Card>
        )}

        {err && <p className="text-[12px]" style={{ color: "#ff8080" }}>{err}</p>}
        {msg && <p className="text-[12px]" style={{ color: "var(--color-neon)" }}>{msg}</p>}
      </div>
    </SettingsScreen>
  );
}
