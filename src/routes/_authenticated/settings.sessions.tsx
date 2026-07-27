import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SettingsScreen, Card, GhostButton } from "@/components/SettingsScreen";
import { confirmDialog } from "@/lib/confirm";

export const Route = createFileRoute("/_authenticated/settings/sessions")({
  head: () => ({ meta: [{ title: "Sessions · Settings · ZOMBIEREX" }, { name: "description", content: "See where you're signed in and sign out other devices." }] }),
  component: SessionsPage,
});

function SessionsPage() {
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ device: string; ua: string; issuedAt?: string; expiresAt?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      setInfo({
        device: /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : "Browser",
        ua,
        issuedAt: (s as any)?.user?.last_sign_in_at,
        expiresAt: s?.expires_at ? new Date(s.expires_at * 1000).toLocaleString() : undefined,
      });
    });
  }, []);

  const signOutOthers = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setBusy(false);
    if (error) setMsg(error.message); else setMsg("Signed out of other devices.");
  };
  const signOutEverywhere = async () => {
    if (!confirm("Sign out of ALL devices, including this one?")) return;
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/auth", replace: true });
  };

  return (
    <SettingsScreen index="06.07" section="SESSIONS" title="Where you're signed in" subtitle="This is the current device. Sign out others if you don't recognise something.">
      <div className="space-y-3">
        <Card>
          <p className="serif text-[18px]" style={{ color: "var(--color-ink)" }}>{info?.device ?? "This device"}</p>
          <p className="mono-tag mt-1" style={{ color: "var(--color-silver)", fontSize: 10 }}>CURRENT SESSION</p>
          {info?.ua && <p className="mt-2 break-all text-[11px]" style={{ color: "var(--color-silver)" }}>{info.ua}</p>}
          {info?.issuedAt && <p className="mono-tag mt-2" style={{ color: "var(--color-silver)" }}>Signed in {new Date(info.issuedAt).toLocaleString()}</p>}
          {info?.expiresAt && <p className="mono-tag" style={{ color: "var(--color-silver)" }}>Token expires {info.expiresAt}</p>}
        </Card>
        <GhostButton onClick={signOutOthers} disabled={busy}>{busy ? "Signing out…" : "Sign out other devices"}</GhostButton>
        <button onClick={signOutEverywhere} className="tap w-full rounded-md px-4 py-3 text-[13px]"
          style={{ background: "transparent", color: "#ff8080", border: "1px solid rgba(255,80,80,0.5)" }}>Sign out of all devices</button>
        {msg && <p className="text-[12px]" style={{ color: "var(--color-neon)" }}>{msg}</p>}
      </div>
    </SettingsScreen>
  );
}
