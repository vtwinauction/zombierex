/**
 * Drag Challenge Hub — send a challenge or respond to incoming challenges.
 * The second lane of Race Mode is a real rider who accepted here.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createChallenge, listChallenges, respondChallenge } from "@/lib/drag-match.functions";

export const Route = createFileRoute("/_authenticated/drag/challenge")({
  head: () => ({
    meta: [
      { title: "Challenge a Rider · Drag · ZOMBIEREX" },
      {
        name: "description",
        content:
          "Send a real head-to-head drag race challenge and race another rider live on ZOMBIEREX.",
      },
    ],
  }),
  component: DragChallengePage,
});

function DragChallengePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listChallenges);
  const createFn = useServerFn(createChallenge);
  const respondFn = useServerFn(respondChallenge);

  const { data, refetch } = useQuery({
    queryKey: ["drag", "challenges"],
    queryFn: () => listFn(),
    refetchInterval: 10_000,
  });

  // Realtime — refetch on any challenge row change touching me
  useEffect(() => {
    const ch = supabase
      .channel(`drag-challenges-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "drag_challenges" }, () =>
        refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refetch]);

  const [handle, setHandle] = useState("");
  const [strip, setStrip] = useState<"eighth" | "quarter">("quarter");
  const [tree, setTree] = useState<"pro" | "sportsman">("sportsman");
  const [stake, setStake] = useState(50);
  const [message, setMessage] = useState("");

  const send = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          opponent_handle: handle,
          strip_mode: strip,
          tree_mode: tree,
          stake_xp: stake,
          message: message || null,
        },
      }),
    onSuccess: () => {
      toast.success("Challenge sent");
      setHandle("");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["drag", "challenges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const respond = useMutation({
    mutationFn: (v: { id: string; action: "accept" | "decline" | "cancel" }) =>
      respondFn({ data: v }),
    onSuccess: (r: any) => {
      if (r?.status === "accepted" && r.match_id)
        nav({ to: "/drag/match/$id", params: { id: r.match_id } });
      qc.invalidateQueries({ queryKey: ["drag", "challenges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const challenges = data ?? [];
  const received = challenges.filter((c: any) => c.me_is_opponent && c.status === "pending");
  const sent = challenges.filter((c: any) => !c.me_is_opponent && c.status === "pending");
  const history = challenges.filter((c: any) => c.status !== "pending");

  return (
    <div className="min-h-svh pb-24">
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <Link
            to="/drag"
            className="tap mono-caps text-[10px]"
            style={{ color: "var(--color-silver)" }}
          >
            ← DRAG
          </Link>
        </div>
        <h1 className="serif mt-2 text-3xl" style={{ color: "var(--color-ink)" }}>
          Challenge a Rider
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-ink-3)" }}>
          Real rider vs real rider. Both accept the challenge, both stage, one green light for both.
        </p>

        {/* Send */}
        <section
          className="mt-5 rounded-2xl border p-4"
          style={{
            borderColor: "rgba(0,200,83,0.35)",
            background: "linear-gradient(120deg,#050505,#0f2015)",
          }}
        >
          <p
            className="mono-caps text-[10px] font-black"
            style={{ color: "#00c853", letterSpacing: "0.24em" }}
          >
            ◆ NEW CHALLENGE
          </p>
          <label className="mt-3 block">
            <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
              OPPONENT HANDLE
            </span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@rider"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-hair)", background: "#0a0a0a", color: "#f5f5f5" }}
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label>
              <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
                STRIP
              </span>
              <select
                value={strip}
                onChange={(e) => setStrip(e.target.value as any)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--color-hair)",
                  background: "#0a0a0a",
                  color: "#f5f5f5",
                }}
              >
                <option value="quarter">1/4 mile (402 m)</option>
                <option value="eighth">1/8 mile (201 m)</option>
              </select>
            </label>
            <label>
              <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
                TREE
              </span>
              <select
                value={tree}
                onChange={(e) => setTree(e.target.value as any)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--color-hair)",
                  background: "#0a0a0a",
                  color: "#f5f5f5",
                }}
              >
                <option value="sportsman">Sportsman</option>
                <option value="pro">Pro</option>
              </select>
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
              STAKE (XP)
            </span>
            <input
              type="number"
              min={0}
              max={5000}
              value={stake}
              onChange={(e) => setStake(Math.max(0, Math.min(5000, Number(e.target.value) || 0)))}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-hair)", background: "#0a0a0a", color: "#f5f5f5" }}
            />
          </label>
          <label className="mt-3 block">
            <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
              MESSAGE (OPTIONAL)
            </span>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={280}
              placeholder="Same spot 8pm?"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-hair)", background: "#0a0a0a", color: "#f5f5f5" }}
            />
          </label>
          <button
            disabled={!handle.trim() || send.isPending}
            onClick={() => send.mutate()}
            className="tap mono-caps mt-4 w-full text-[11px] font-black"
            style={{
              padding: "12px",
              background: "var(--color-neon)",
              color: "var(--color-obsidian)",
              opacity: !handle.trim() || send.isPending ? 0.5 : 1,
            }}
          >
            {send.isPending ? "SENDING…" : "▶ SEND CHALLENGE"}
          </button>
          <p className="mt-2 text-[11px]" style={{ color: "var(--color-ink-3)" }}>
            Challenge expires in 15 minutes if not accepted.
          </p>
        </section>

        {/* Received */}
        <Section title="RECEIVED" empty="No challenges waiting for you.">
          {received.map((c: any) => (
            <ChallengeCard
              key={c.id}
              c={c}
              actions={
                <>
                  <button
                    onClick={() => respond.mutate({ id: c.id, action: "accept" })}
                    className="tap mono-caps text-[10px] font-black"
                    style={{
                      padding: "8px 12px",
                      background: "var(--color-neon)",
                      color: "var(--color-obsidian)",
                    }}
                  >
                    ACCEPT ▶
                  </button>
                  <button
                    onClick={() => respond.mutate({ id: c.id, action: "decline" })}
                    className="tap mono-caps text-[10px] font-black"
                    style={{
                      padding: "8px 12px",
                      background: "#111",
                      color: "#f5f5f5",
                      border: "1px solid #333",
                    }}
                  >
                    DECLINE
                  </button>
                </>
              }
            />
          ))}
        </Section>

        {/* Sent */}
        <Section title="SENT" empty="Nothing pending on your side.">
          {sent.map((c: any) => (
            <ChallengeCard
              key={c.id}
              c={c}
              actions={
                <button
                  onClick={() => respond.mutate({ id: c.id, action: "cancel" })}
                  className="tap mono-caps text-[10px] font-black"
                  style={{
                    padding: "8px 12px",
                    background: "#111",
                    color: "#f5f5f5",
                    border: "1px solid #333",
                  }}
                >
                  CANCEL
                </button>
              }
            />
          ))}
        </Section>

        {/* History */}
        <Section title="HISTORY" empty="No past challenges yet.">
          {history.slice(0, 20).map((c: any) => (
            <ChallengeCard
              key={c.id}
              c={c}
              actions={
                c.match_id ? (
                  <Link
                    to="/drag/match/$id"
                    params={{ id: c.match_id }}
                    className="tap mono-caps text-[10px] font-black"
                    style={{
                      padding: "8px 12px",
                      background: "#111",
                      color: "var(--color-neon)",
                      border: "1px solid rgba(0,200,83,0.4)",
                    }}
                  >
                    OPEN
                  </Link>
                ) : null
              }
            />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const kids = Array.isArray(children) ? children : [children];
  const isEmpty = kids.filter(Boolean).length === 0;
  return (
    <section className="mt-6">
      <h2 className="mono-caps text-[10px] font-black" style={{ color: "var(--color-silver)" }}>
        {title}
      </h2>
      <div className="mt-2 space-y-2">
        {isEmpty ? (
          <div
            className="rounded-lg border border-dashed p-6 text-center text-sm"
            style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink-3)" }}
          >
            {empty}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function ChallengeCard({ c, actions }: { c: any; actions: React.ReactNode }) {
  const other = c.me_is_opponent ? c.challenger : c.opponent;
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full overflow-hidden" style={{ background: "#222" }}>
          {other?.avatar_url && (
            <img src={other.avatar_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: "var(--color-ink)" }}>
            {other?.display_name || other?.handle || "Rider"}
          </p>
          <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
            {c.strip_mode === "quarter" ? "1/4 MI" : "1/8 MI"} · {c.tree_mode.toUpperCase()} · STAKE{" "}
            {c.stake_xp} XP · {c.status.toUpperCase()}
          </p>
          {c.message && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-ink-3)" }}>
              &ldquo;{c.message}&rdquo;
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">{actions}</div>
      </div>
    </div>
  );
}
