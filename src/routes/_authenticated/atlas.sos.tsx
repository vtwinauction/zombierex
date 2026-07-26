/**
 * Emergency SOS hub — manage emergency contacts, arm crash detection,
 * and fire a manual SOS. Sharing link is generated on activation and
 * ready to forward to a contact who is not on the platform.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  listContacts, upsertContact, deleteContact,
  triggerSOS, closeSOS, pushSOSPing, listMyAlerts,
} from "@/lib/sos.functions";
import { createCrashDetector } from "@/lib/crash-detection";
import { AlertTriangle, Phone, Mail, Trash2, Plus, Radio, Shield, Copy, X, CheckCircle2, Activity } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/atlas/sos")({
  head: () => ({
    meta: [
      { title: "Emergency SOS · ZOMBIEREX" },
      { name: "description", content: "One-tap SOS with live location sharing and crash detection." },
    ],
  }),
  component: SosHub,
});

type Contact = {
  id: string; name: string; phone: string | null; email: string | null;
  relation: string | null; is_primary: boolean; created_at: string;
};
type ActiveAlert = { id: string; share_token: string; created_at: string };

function SosHub() {
  const list = useServerFn(listContacts);
  const upsert = useServerFn(upsertContact);
  const del = useServerFn(deleteContact);
  const trigger = useServerFn(triggerSOS);
  const close = useServerFn(closeSOS);
  const ping = useServerFn(pushSOSPing);
  const history = useServerFn(listMyAlerts);
  const qc = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ["sos", "contacts"],
    queryFn: () => list() as Promise<Contact[]>,
  });
  const { data: past = [] } = useQuery({
    queryKey: ["sos", "history"],
    queryFn: () => history() as Promise<any[]>,
  });

  const [active, setActive] = useState<ActiveAlert | null>(null);
  const [armed, setArmed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [pendingKind, setPendingKind] = useState<"manual" | "crash" | "test">("manual");
  const detectorRef = useRef<ReturnType<typeof createCrashDetector> | null>(null);

  // Grab a fix once for the initial payload (kept fresh via pings after arming)
  const [pos, setPos] = useState<GeolocationPosition | null>(null);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos(p),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  /* --- crash detection --- */
  useEffect(() => {
    if (!armed) { detectorRef.current?.stop(); detectorRef.current = null; return; }
    const d = createCrashDetector({
      threshold: 40,
      onImpact: (g) => {
        toast.error(`Impact detected (${g.toFixed(1)}g). SOS in 10s — cancel if you're OK.`);
        beginCountdown("crash", 10);
      },
    });
    detectorRef.current = d;
    d.start().then((r) => {
      if (r === "unsupported") { toast.error("This device doesn't expose motion sensors."); setArmed(false); }
      else if (r === "denied") { toast.error("Motion permission denied."); setArmed(false); }
      else { toast.success("Crash detection armed."); }
    });
    return () => { d.stop(); };
  }, [armed]);

  /* --- countdown before firing --- */
  function beginCountdown(kind: "manual" | "crash" | "test", seconds: number) {
    setPendingKind(kind); setCountdown(seconds);
  }
  useEffect(() => {
    if (countdown == null) return;
    if (countdown <= 0) { fire(pendingKind); setCountdown(null); return; }
    const t = setTimeout(() => setCountdown((c) => (c == null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, pendingKind]);

  const fireMut = useMutation({
    mutationFn: async (kind: "manual" | "crash" | "test") =>
      trigger({
        data: {
          kind,
          message: kind === "test" ? "This is a test — no response needed." : null,
          latitude: pos?.coords.latitude,
          longitude: pos?.coords.longitude,
          accuracy_m: pos?.coords.accuracy,
          heading: pos?.coords.heading ?? null,
          speed_kmh: pos?.coords.speed ? pos.coords.speed * 3.6 : null,
        },
      }),
    onSuccess: (row) => {
      setActive({ id: row.id, share_token: row.share_token, created_at: row.created_at });
      qc.invalidateQueries({ queryKey: ["sos", "history"] });
      toast.success("SOS active — sharing your live location.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not activate SOS"),
  });
  function fire(kind: "manual" | "crash" | "test") { fireMut.mutate(kind); }

  /* --- once active, stream pings every 6s --- */
  useEffect(() => {
    if (!active) return;
    const send = () => {
      if (!pos) return;
      ping({ data: {
        alert_id: active.id,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy,
        speed_kmh: pos.coords.speed ? pos.coords.speed * 3.6 : undefined,
        heading: pos.coords.heading ?? undefined,
      }}).catch(() => {});
    };
    send();
    const i = setInterval(send, 6000);
    return () => clearInterval(i);
  }, [active, pos, ping]);

  const shareUrl = active ? `${typeof window !== "undefined" ? window.location.origin : ""}/sos/${active.share_token}` : "";
  const primary = contacts.find((c) => c.is_primary) ?? contacts[0];

  return (
    <div className="min-h-svh pb-24" style={{ background: "var(--color-canvas)" }}>
      <header className="sticky top-0 z-10 px-4 py-3 border-b" style={{ background: "var(--color-canvas)", borderColor: "var(--color-line)" }}>
        <div className="flex items-center gap-2">
          <Link to="/atlas" aria-label="Back" className="tap p-1"><X className="h-5 w-5" /></Link>
          <h1 className="text-base font-semibold tracking-tight">Emergency SOS</h1>
        </div>
      </header>

      {/* Big red button */}
      <section className="px-4 pt-6">
        {!active ? (
          countdown != null ? (
            <div className="rounded-2xl p-5 text-center" style={{ background: "#fff1f1", border: "1px solid #ffb3b3" }}>
              <div className="text-xs uppercase tracking-wider text-red-700">Sending {pendingKind} SOS in</div>
              <div className="mt-1 text-6xl font-bold text-red-600 tabular-nums">{countdown}</div>
              <button
                onClick={() => { setCountdown(null); toast.success("Cancelled."); }}
                className="mt-3 tap rounded-full px-6 py-3 text-sm font-semibold text-white"
                style={{ background: "#111" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onPointerDown={() => beginCountdown("manual", 3)}
              className="tap w-full rounded-2xl py-8 text-center font-bold tracking-wide text-white shadow-lg"
              style={{
                background: "linear-gradient(160deg,#ff2b2b,#b60000)",
                boxShadow: "0 12px 30px rgba(220,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
              disabled={fireMut.isPending}
            >
              <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
              <div className="text-lg">HOLD / TAP FOR SOS</div>
              <div className="text-xs opacity-80 mt-1">3-second cancel window before it fires</div>
            </button>
          )
        ) : (
          <ActivePanel
            active={active}
            shareUrl={shareUrl}
            onCancel={async () => {
              await close({ data: { id: active.id, status: "cancelled" } });
              setActive(null);
              qc.invalidateQueries({ queryKey: ["sos", "history"] });
              toast.success("SOS cancelled.");
            }}
            onResolve={async () => {
              await close({ data: { id: active.id, status: "resolved" } });
              setActive(null);
              qc.invalidateQueries({ queryKey: ["sos", "history"] });
              toast.success("Marked safe.");
            }}
            primary={primary}
          />
        )}
      </section>

      {/* Crash detection */}
      <section className="px-4 pt-6">
        <div className="flex items-center justify-between rounded-xl px-4 py-3 border" style={{ borderColor: "var(--color-line)" }}>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5" style={{ color: armed ? "#00c853" : "var(--color-ink-3)" }} />
            <div>
              <div className="text-sm font-medium">Crash detection</div>
              <div className="text-[11px]" style={{ color: "var(--color-ink-3)" }}>
                Fires SOS after an impact (10s cancel window)
              </div>
            </div>
          </div>
          <Toggle checked={armed} onChange={setArmed} />
        </div>
        <button
          onClick={() => beginCountdown("test", 3)}
          className="mt-2 tap w-full rounded-lg px-4 py-2 text-xs font-medium border"
          style={{ borderColor: "var(--color-line)" }}
        >
          Send a TEST alert
        </button>
      </section>

      {/* Contacts */}
      <section className="px-4 pt-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Emergency contacts</h2>
        </div>
        <ContactList contacts={contacts} onDelete={async (id) => {
          await del({ data: { id } }); qc.invalidateQueries({ queryKey: ["sos", "contacts"] });
        }} />
        <AddContactForm onAdd={async (c) => {
          await upsert({ data: c }); qc.invalidateQueries({ queryKey: ["sos", "contacts"] });
        }} />
      </section>

      {/* History */}
      <section className="px-4 pt-8">
        <h2 className="text-sm font-semibold mb-2">Recent alerts</h2>
        {past.length === 0 ? (
          <div className="text-xs" style={{ color: "var(--color-ink-3)" }}>No alerts yet.</div>
        ) : (
          <ul className="space-y-2">
            {past.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--color-line)" }}>
                <div className="flex items-center gap-2">
                  <StatusDot status={a.status} />
                  <div>
                    <div className="font-medium uppercase tracking-wider">{a.kind}</div>
                    <div style={{ color: "var(--color-ink-3)" }}>{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <a href={`/sos/${a.share_token}`} className="underline">view</a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ActivePanel({
  active, shareUrl, onCancel, onResolve, primary,
}: { active: ActiveAlert; shareUrl: string; onCancel: () => void; onResolve: () => void; primary?: Contact }) {
  const sms = primary?.phone
    ? `sms:${primary.phone}?&body=${encodeURIComponent(`SOS — I need help. Track me: ${shareUrl}`)}`
    : null;
  return (
    <div className="rounded-2xl p-4 text-white" style={{ background: "linear-gradient(160deg,#c00,#7a0000)" }}>
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5 animate-pulse" />
        <div className="text-sm font-semibold tracking-wide">SOS ACTIVE — live location sharing</div>
      </div>
      <div className="mt-2 text-xs opacity-90 break-all">{shareUrl}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={async () => {
          try { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied"); } catch {}
        }} className="tap rounded-lg bg-white/20 px-3 py-2 text-sm font-medium">
          <Copy className="inline h-4 w-4 mr-1" /> Copy link
        </button>
        {sms ? (
          <a href={sms} className="tap rounded-lg bg-white text-red-700 px-3 py-2 text-sm font-semibold text-center">
            <Phone className="inline h-4 w-4 mr-1" /> Text {primary!.name}
          </a>
        ) : (
          <button onClick={async () => {
            try {
              const { share: nativeShare } = await import("@/lib/native");
              await nativeShare({ title: "SOS", text: "I need help — track me:", url: shareUrl, dialogTitle: "Share SOS" });
            } catch {}
          }} className="tap rounded-lg bg-white text-red-700 px-3 py-2 text-sm font-semibold">Share…</button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="tap rounded-lg border border-white/40 px-3 py-2 text-xs">Cancel (false alarm)</button>
        <button onClick={onResolve} className="tap rounded-lg bg-black/40 px-3 py-2 text-xs font-medium">
          <CheckCircle2 className="inline h-4 w-4 mr-1" /> I'm safe
        </button>
      </div>
    </div>
  );
}

function ContactList({ contacts, onDelete }: { contacts: Contact[]; onDelete: (id: string) => void }) {
  if (!contacts.length) return <div className="text-xs mb-3" style={{ color: "var(--color-ink-3)" }}>Add at least one trusted contact.</div>;
  return (
    <ul className="mb-3 space-y-2">
      {contacts.map((c) => (
        <li key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {c.name} {c.is_primary && <span className="ml-1 text-[10px] uppercase tracking-wider" style={{ color: "#00c853" }}>primary</span>}
            </div>
            <div className="text-[11px] truncate" style={{ color: "var(--color-ink-3)" }}>
              {[c.phone, c.email, c.relation].filter(Boolean).join(" · ")}
            </div>
          </div>
          <button onClick={() => onDelete(c.id)} className="tap p-1 text-red-600" aria-label="Delete contact"><Trash2 className="h-4 w-4" /></button>
        </li>
      ))}
    </ul>
  );
}

function AddContactForm({ onAdd }: { onAdd: (c: any) => Promise<void> }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState("");
  const [primary, setPrimary] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
          await onAdd({ name: name.trim(), phone: phone || null, email: email || null, relation: relation || null, is_primary: primary });
          setName(""); setPhone(""); setEmail(""); setRelation(""); setPrimary(false);
        } finally { setBusy(false); }
      }}
      className="rounded-lg border p-3 space-y-2"
      style={{ borderColor: "var(--color-line)" }}
    >
      <div className="text-xs font-semibold flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add contact</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--color-line)" }} />
      <div className="grid grid-cols-2 gap-2">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" inputMode="tel" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--color-line)" }} />
        <input value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="Relation" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--color-line)" }} />
      </div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" inputMode="email" className="w-full rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--color-line)" }} />
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} /> Primary contact
      </label>
      <button disabled={busy || !name.trim()} className="tap w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#111" }}>
        {busy ? "Saving…" : "Save contact"}
      </button>
    </form>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 rounded-full transition-colors"
      style={{ background: checked ? "#00c853" : "#d0d0d0" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? "22px" : "2px" }}
      />
    </button>
  );
}

function StatusDot({ status }: { status: string }) {
  const c = status === "active" ? "#dc2626" : status === "resolved" ? "#00c853" : "#9ca3af";
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />;
}
