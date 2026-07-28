import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PullToRefresh } from "@/components/PullToRefresh";
import {
  listMyNotifications,
  markAllRead,
  markNotificationRead,
} from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Log · ZOMBIEREX" },
      { name: "description", content: "System log of activity across your ZOMBIEREX network." },
    ],
  }),
  component: NotificationsPage,
});

type NotifRow = {
  id: string;
  actor_id: string | null;
  kind: string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

const KIND_META: Record<string, { tag: string; tone: string; verb: string }> = {
  like:          { tag: "LIKE", tone: "var(--color-heat, #ff5a3c)",   verb: "liked your post" },
  comment:       { tag: "CMT",  tone: "var(--color-ink, #111)",       verb: "commented on your post" },
  follow:        { tag: "FLW",  tone: "var(--color-cool, #3860ff)",   verb: "started following you" },
  mention:       { tag: "MNTN", tone: "var(--color-plum, #7a3fbf)",   verb: "mentioned you" },
  message:       { tag: "DM",   tone: "var(--color-ink, #111)",       verb: "sent you a message" },
  marketplace:   { tag: "MKT",  tone: "var(--color-signal, #d1a44b)", verb: "activity on your listing" },
  booking:       { tag: "BKG",  tone: "var(--color-signal, #d1a44b)", verb: "booking update" },
  order:         { tag: "ORD",  tone: "var(--color-signal, #d1a44b)", verb: "order update" },
  vendor_update: { tag: "VNDR", tone: "var(--color-plum, #7a3fbf)",   verb: "vendor update" },
  subscription:  { tag: "SUB",  tone: "var(--color-plum, #7a3fbf)",   verb: "subscription update" },
  event:         { tag: "EVT",  tone: "var(--color-neon, #00c853)",   verb: "event update" },
  system:        { tag: "SYS",  tone: "var(--color-ash, #6b6b6b)",    verb: "system notice" },
};

function NotificationsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const fetchList = useServerFn(listMyNotifications);
  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllRead);

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchList({ data: { limit: 30 } }) as Promise<NotifRow[]>,
    enabled: !!signedIn,
    staleTime: 30_000,
  });

  // Realtime: refresh on any new notification for this user
  useEffect(() => {
    if (!signedIn) return;
    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data }) => {
      userId = data.user?.id ?? null;
      if (!userId) return;
      channel = supabase
        .channel(`notif-page-${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          () => {
            qc.invalidateQueries({ queryKey: ["notifications"] });
            qc.invalidateQueries({ queryKey: ["inbox-counts"] });
          },
        )
        .subscribe();
    });
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [signedIn, qc]);


  const markOneMut = useMutation({
    mutationFn: (id: string) => markOne({ data: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const prev = qc.getQueryData<NotifRow[]>(["notifications"]);
      qc.setQueryData<NotifRow[]>(["notifications"], (rows) =>
        rows?.map((r) => (r.id === id ? { ...r, read_at: new Date().toISOString() } : r)) ?? [],
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["notifications"], ctx.prev),
  });

  const markAllMut = useMutation({
    mutationFn: () => markAll({}),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const prev = qc.getQueryData<NotifRow[]>(["notifications"]);
      const now = new Date().toISOString();
      qc.setQueryData<NotifRow[]>(["notifications"], (rows) =>
        rows?.map((r) => ({ ...r, read_at: r.read_at ?? now })) ?? [],
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["notifications"], ctx.prev),
  });

  const rows = q.data ?? [];
  const unread = rows.filter((r) => !r.read_at).length;

  return (
    <PullToRefresh onRefresh={async () => { await qc.invalidateQueries({ queryKey: ["notifications"] }); }}>
      <div>
        <div className="flex items-end justify-between px-4 pt-6">
          <div>
            <p className="mono-tag">SIGNALS · LAST 24H</p>
            <h1 className="mt-2 display-xl text-5xl uppercase">
              Log{" "}
              {unread > 0 && (
                <span
                  className="mono-num align-middle px-2 py-1 text-xs"
                  style={{ background: "var(--color-neon, #00c853)", color: "#0a0f08" }}
                >
                  {unread}
                </span>
              )}
            </h1>
          </div>
          <button
            className="mono-tag disabled:opacity-40"
            style={{ color: "var(--color-ash)" }}
            onClick={() => markAllMut.mutate()}
            disabled={unread === 0 || markAllMut.isPending}
          >
            MARK ALL READ
          </button>
        </div>

        <div
          className="mt-6 grid grid-cols-[52px_60px_1fr_auto] gap-3 px-4 py-2 hairline-t hairline-b"
          style={{ background: "var(--color-mist)" }}
        >
          <span className="mono-tag" style={{ color: "var(--color-ash)" }}>T-MINUS</span>
          <span className="mono-tag" style={{ color: "var(--color-ash)" }}>TYPE</span>
          <span className="mono-tag" style={{ color: "var(--color-ash)" }}>EVENT</span>
          <span className="mono-tag" style={{ color: "var(--color-ash)" }}>ACT</span>
        </div>

        {signedIn === false && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm" style={{ color: "var(--color-ash)" }}>Sign in to view your notifications.</p>
          </div>
        )}

        {signedIn && q.isLoading && (
          <div className="px-4 py-10 text-center">
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>LOADING…</p>
          </div>
        )}

        {signedIn && !q.isLoading && rows.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>NO SIGNALS</p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--color-ash)" }}>
              Interactions with your posts, rides, and listings will appear here.
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <ul className="divide-y divide-hair hairline-b">
            {rows.map((n) => {
              const meta = KIND_META[n.kind] ?? KIND_META.system;
              const pay = (n.payload ?? {}) as Record<string, unknown>;
              const actor = (pay.actor_handle as string) || (pay.actor_name as string) || "someone";
              const text = (pay.text as string) || meta.verb;
              const unreadRow = !n.read_at;
              return (
                <li
                  key={n.id}
                  className="grid grid-cols-[52px_60px_1fr_auto] items-center gap-3 px-4 py-4 cursor-pointer"
                  style={{ background: unreadRow ? "rgba(0,200,83,0.05)" : "transparent" }}
                  onClick={() => unreadRow && markOneMut.mutate(n.id)}
                >
                  <span className="mono-num text-xs" style={{ color: "var(--color-ash)" }}>
                    {timeAgo(n.created_at)}
                  </span>
                  <span
                    className="mono-tag inline-block px-1.5 py-1"
                    style={{ background: meta.tone, color: "var(--color-bone, #fff)" }}
                  >
                    {meta.tag}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="min-w-0 truncate text-[13px]">
                      <span className="font-bold">@{actor}</span>{" "}
                      <span style={{ color: "var(--color-ash)" }}>{text}</span>
                    </p>
                  </div>
                  {unreadRow ? (
                    <span
                      aria-label="Unread"
                      className="ml-2 inline-block h-2 w-2 rounded-full"
                      style={{ background: "var(--color-neon, #00c853)", boxShadow: "0 0 6px rgba(0,200,83,0.6)" }}
                    />
                  ) : (
                    <span className="mono-tag" style={{ color: "var(--color-ash)" }}>OPEN →</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="px-4 py-8 text-center">
          <p className="mono-tag" style={{ color: "var(--color-ash)" }}>END OF LOG</p>
        </div>
      </div>
    </PullToRefresh>
  );
}

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
