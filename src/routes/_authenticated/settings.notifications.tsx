import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SettingsScreen, Card } from "@/components/SettingsScreen";
import { getMyPreferences, updateMyPreferences } from "@/lib/notifications.functions";
import { listMyDevices, revokeMyDevice, sendTestPush } from "@/lib/devices.functions";
import { confirmDialog } from "@/lib/confirm";

export const Route = createFileRoute("/_authenticated/settings/notifications")({
  head: () => ({
    meta: [
      { title: "Notification details · Settings · ZOMBIEREX" },
      { name: "description", content: "Choose exactly which activity notifies you on ZOMBIEREX." },
    ],
  }),
  component: NotifPrefsPage,
});

type PrefKey =
  | "likes" | "comments" | "follows" | "mentions" | "messages"
  | "marketplace" | "bookings" | "orders" | "vendor_updates"
  | "subscriptions" | "events";

const CATS: Array<{ id: PrefKey; label: string; hint: string }> = [
  { id: "likes", label: "Likes", hint: "Someone likes your post or reel" },
  { id: "comments", label: "Comments", hint: "New comments and replies" },
  { id: "follows", label: "New followers", hint: "Riders who follow your garage" },
  { id: "mentions", label: "Mentions & tags", hint: "You're tagged in a post or story" },
  { id: "messages", label: "Direct messages", hint: "New DMs and group chats" },
  { id: "marketplace", label: "Marketplace", hint: "Offers, messages and price drops" },
  { id: "bookings", label: "Bookings", hint: "Reservation updates and reminders" },
  { id: "orders", label: "Orders", hint: "Purchase, shipping and delivery updates" },
  { id: "vendor_updates", label: "Vendor updates", hint: "News from shops you follow" },
  { id: "subscriptions", label: "Subscriptions", hint: "Renewal and plan changes" },
  { id: "events", label: "Events", hint: "Nearby meets and event reminders" },
];

type Prefs = Record<PrefKey, boolean> & { push_enabled: boolean; email_enabled: boolean };

const DEF: Prefs = {
  likes: true, comments: true, follows: true, mentions: true, messages: true,
  marketplace: true, bookings: true, orders: true, vendor_updates: true,
  subscriptions: true, events: true,
  push_enabled: true, email_enabled: true,
};

function NotifPrefsPage() {
  const qc = useQueryClient();
  const getPrefs = useServerFn(getMyPreferences);
  const updatePrefs = useServerFn(updateMyPreferences);

  const prefsQ = useQuery({
    queryKey: ["notifications", "preferences", "mine"],
    queryFn: async () => await getPrefs(),
  });

  const [p, setP] = useState<Prefs>(DEF);

  useEffect(() => {
    const row = prefsQ.data as any;
    if (row) setP({ ...DEF, ...row });
  }, [prefsQ.data]);

  const saveM = useMutation({
    mutationFn: async (patch: Partial<Prefs>) => updatePrefs({ data: patch }),
    onSuccess: (row) => {
      qc.setQueryData(["notifications", "preferences", "mine"], row);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const set = <K extends keyof Prefs>(key: K, v: Prefs[K]) => {
    const next = { ...p, [key]: v };
    setP(next);
    saveM.mutate({ [key]: v } as Partial<Prefs>);
  };

  return (
    <SettingsScreen
      index="06.09"
      section="NOTIFICATIONS"
      title="Notification details"
      subtitle="Toggle push and email delivery, then choose which activity types notify you."
    >
      {prefsQ.isLoading && (
        <Card>
          <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>Loading…</p>
        </Card>
      )}

      {!prefsQ.isLoading && (
        <>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px]" style={{ color: "var(--color-ink)" }}>Push notifications</p>
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-silver)" }}>On-device alerts across ZOMBIEREX.</p>
              </div>
              <Toggle checked={p.push_enabled} onChange={(v) => set("push_enabled", v)} />
            </div>
          </Card>
          <div className="h-2" />
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px]" style={{ color: "var(--color-ink)" }}>Email notifications</p>
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-silver)" }}>Summaries and critical account emails.</p>
              </div>
              <Toggle checked={p.email_enabled} onChange={(v) => set("email_enabled", v)} />
            </div>
          </Card>

          <p className="mono-tag mt-4 mb-2 px-1" style={{ color: "var(--color-silver)" }}>ACTIVITY TYPES</p>
          <div className="space-y-2">
            {CATS.map((c) => (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px]" style={{ color: "var(--color-ink)" }}>{c.label}</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-silver)" }}>{c.hint}</p>
                  </div>
                  <Toggle checked={!!p[c.id]} onChange={(v) => set(c.id, v)} />
                </div>
              </Card>
            ))}
          </div>

          <p className="mono-tag mt-4" style={{ color: "var(--color-silver)", fontSize: 10 }}>
            {saveM.isPending ? "SAVING…" : "SYNCED TO BACKEND"}
          </p>
        </>
      )}
    </SettingsScreen>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="tap h-5 w-9 rounded-full transition-colors shrink-0"
      style={{ background: checked ? "var(--color-neon)" : "var(--color-hair-strong)", position: "relative" }}
      aria-pressed={checked}
    >
      <span style={{ position: "absolute", top: 2, left: checked ? 18 : 2, height: 16, width: 16, borderRadius: 999, background: "#fff", transition: "left .16s ease" }} />
    </button>
  );
}
