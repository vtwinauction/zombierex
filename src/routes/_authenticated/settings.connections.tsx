import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SettingsScreen, Card, GhostButton } from "@/components/SettingsScreen";
import { confirmDialog } from "@/lib/confirm";

export const Route = createFileRoute("/_authenticated/settings/connections")({
  head: () => ({ meta: [{ title: "Connected accounts · Settings · ZOMBIEREX" }, { name: "description", content: "Link Google, Apple or Instagram to your ZOMBIEREX account." }] }),
  component: ConnectionsPage,
});

const PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
  { id: "facebook", label: "Facebook" },
] as const;

function ConnectionsPage() {
  const [identities, setIdentities] = useState<Array<{ id: string; provider: string; email?: string }>>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.auth.getUserIdentities();
    setIdentities(((data as any)?.identities ?? []).map((i: any) => ({ id: i.identity_id ?? i.id, provider: i.provider, email: i.identity_data?.email })));
  };
  useEffect(() => { load(); }, []);

  const link = async (provider: string) => {
    setMsg(null);
    const { error } = await (supabase.auth as any).linkIdentity({ provider, options: { redirectTo: window.location.origin } });
    if (error) setMsg(error.message);
  };
  const unlink = async (id: string) => {
    const target = identities.find((i) => i.id === id);
    if (!target) return;
    if (!(await confirmDialog({ title: `Disconnect ${target.provider}?`, destructive: true, confirmLabel: "Disconnect" }))) return;
    const { error } = await (supabase.auth as any).unlinkIdentity(target);
    if (error) setMsg(error.message); else load();
  };

  const isLinked = (p: string) => identities.some((i) => i.provider === p);

  return (
    <SettingsScreen index="06.03" section="CONNECTIONS" title="Connected accounts" subtitle="Sign in faster with linked providers.">
      <div className="space-y-3">
        {PROVIDERS.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px]" style={{ color: "var(--color-ink)" }}>{p.label}</p>
                <p className="mono-tag mt-0.5" style={{ color: "var(--color-silver)", fontSize: 10 }}>
                  {isLinked(p.id) ? identities.find((i) => i.provider === p.id)?.email ?? "Linked" : "Not linked"}
                </p>
              </div>
              {isLinked(p.id) ? (
                <button onClick={() => unlink(identities.find((i) => i.provider === p.id)!.id)}
                  className="mono-tag tap px-3 py-1.5 rounded-full"
                  style={{ border: "1px solid rgba(255,80,80,0.5)", color: "#ff8080" }}>Disconnect</button>
              ) : (
                <button onClick={() => link(p.id)}
                  className="mono-tag tap px-3 py-1.5 rounded-full"
                  style={{ border: "1px solid var(--color-hair-strong)", color: "var(--color-ink)" }}>Connect</button>
              )}
            </div>
          </Card>
        ))}
        {msg && <Card><p className="text-[12px]" style={{ color: "#ff8080" }}>{msg}</p></Card>}
        <GhostButton onClick={load}>Refresh</GhostButton>
      </div>
    </SettingsScreen>
  );
}
