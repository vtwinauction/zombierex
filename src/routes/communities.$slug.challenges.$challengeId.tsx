import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getChallenge, challengeLeaderboard, toggleChallengeVote, myChallengeVotes,
} from "@/lib/communities.functions";

export const Route = createFileRoute("/communities/$slug/challenges/$challengeId")({
  head: ({ params }) => ({
    meta: [
      { title: `Challenge · ${params.slug} · ZOMBIEREX` },
      { name: "description", content: "Weekly challenge leaderboard — vote on the top rider entries in this ZOMBIEREX community." },
    ],
  }),
  component: ChallengePage,
});

function ChallengePage() {
  const { slug, challengeId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchChallenge = useServerFn(getChallenge);
  const fetchBoard = useServerFn(challengeLeaderboard);
  const fetchMyVotes = useServerFn(myChallengeVotes);
  const vote = useServerFn(toggleChallengeVote);

  const { data: challenge } = useQuery({
    queryKey: ["challenge", challengeId],
    queryFn: () => fetchChallenge({ data: { id: challengeId } }),
  });
  const { data: entries = [] } = useQuery({
    queryKey: ["challenge-board", challengeId],
    queryFn: () => fetchBoard({ data: { challenge_id: challengeId } }),
    refetchInterval: 15000,
  });
  const entryIds = useMemo(() => entries.map((e) => e.id), [entries]);
  const { data: votedIds = [] } = useQuery({
    queryKey: ["challenge-mine", challengeId, entryIds.join(",")],
    queryFn: () => fetchMyVotes({ data: { entry_ids: entryIds } }),
    enabled: entryIds.length > 0,
  });
  const votedSet = new Set(votedIds);

  // Realtime: refresh board when votes change
  useEffect(() => {
    const ch = supabase
      .channel(`chal-${challengeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "challenge_entry_votes" },
        () => qc.invalidateQueries({ queryKey: ["challenge-board", challengeId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [challengeId, qc]);

  const voteMut = useMutation({
    mutationFn: (entry_id: string) => vote({ data: { entry_id } }),
    onMutate: async (entry_id) => {
      await qc.cancelQueries({ queryKey: ["challenge-board", challengeId] });
      qc.setQueryData<any[]>(["challenge-board", challengeId], (prev) =>
        (prev ?? []).map((e) => e.id === entry_id
          ? { ...e, votes_count: e.votes_count + (votedSet.has(entry_id) ? -1 : 1) }
          : e));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenge-board", challengeId] });
      qc.invalidateQueries({ queryKey: ["challenge-mine", challengeId, entryIds.join(",")] });
    },
  });

  if (!challenge) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>loading challenge…</p>
      </div>
    );
  }

  const endsAt = new Date(challenge.ends_at);
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86400000));

  return (
    <div className="pb-24">

      <div className="px-4 pt-4">
        <Link to="/communities/$slug" params={{ slug }} className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ← {slug}
        </Link>
      </div>

      {/* Hero */}
      <div className="mt-3 overflow-hidden mx-4" style={{ borderRadius: 16, border: "1px solid var(--color-hair)" }}>
        {challenge.cover_url && (
          <div className="relative aspect-[16/9]">
            <img src={challenge.cover_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,9,11,0.1) 40%, rgba(8,9,11,0.9))" }} />
            <span className="absolute left-3 top-3 mono-tag rounded-full px-2 py-0.5"
              style={{ background: "var(--color-neon)", color: "var(--color-obsidian)", fontSize: 9, letterSpacing: "0.14em" }}>
              CHALLENGE · {daysLeft}D LEFT
            </span>
          </div>
        )}
        <div className="p-4" style={{ background: "var(--color-graphite)" }}>
          <p className="serif text-[24px] italic leading-tight" style={{ color: "var(--color-ink)" }}>{challenge.title}</p>
          {challenge.description && (
            <p className="mt-2 text-[13px]" style={{ color: "var(--color-titanium)" }}>{challenge.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 mono-tag" style={{ fontSize: 9 }}>
            {challenge.hashtag && (
              <span className="rounded-full px-2 py-0.5" style={{ background: "var(--color-obsidian)", color: "var(--color-neon)" }}>
                {challenge.hashtag}
              </span>
            )}
            {challenge.prize && (
              <span className="rounded-full px-2 py-0.5" style={{ background: "var(--color-obsidian)", color: "var(--color-ink)" }}>
                🏆 {challenge.prize}
              </span>
            )}
            <span style={{ color: "var(--color-titanium)" }}>{challenge.entries_count} entries</span>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-4 pt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="mono-tag" style={{ color: "var(--color-neon)", fontSize: 10, letterSpacing: "0.16em" }}>LEADERBOARD</h2>
          <span className="mono-tag" style={{ color: "var(--color-titanium)", fontSize: 9 }}>LIVE</span>
        </div>

        {entries.length === 0 && (
          <div className="mt-3 rounded-xl px-4 py-6 text-center"
            style={{ background: "var(--color-graphite)", border: "1px dashed var(--color-hair-strong)" }}>
            <p className="text-[13px]" style={{ color: "var(--color-ink)" }}>Be the first to enter.</p>
            <p className="mono-tag mt-1" style={{ color: "var(--color-titanium)", fontSize: 10 }}>
              Post a photo/video in this community, then submit it here.
            </p>
          </div>
        )}

        <ol className="mt-3 space-y-2">
          {entries.map((e, i) => {
            const voted = votedSet.has(e.id);
            const rank = i + 1;
            return (
              <li key={e.id} className="flex items-center gap-3 overflow-hidden rounded-xl"
                style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)" }}>
                <div className="grid h-16 w-9 shrink-0 place-items-center mono-num"
                  style={{ background: "var(--color-obsidian)", color: rank <= 3 ? "var(--color-neon)" : "var(--color-titanium)", fontSize: 14 }}>
                  {String(rank).padStart(2, "0")}
                </div>
                <div className="h-16 w-16 shrink-0 overflow-hidden" style={{ background: "var(--color-obsidian)" }}>
                  {e.post?.thumbnail_url || e.post?.media_url ? (
                    <img src={e.post.thumbnail_url ?? e.post.media_url!} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 py-2 pr-2">
                  <p className="mono-num text-[11px]" style={{ color: "var(--color-ink)" }}>{e.user_id.slice(0, 8)}</p>
                  <p className="line-clamp-1 text-[12px]" style={{ color: "var(--color-titanium)" }}>
                    {e.post?.caption ?? "(no caption)"}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const { data } = await supabase.auth.getUser();
                    if (!data.user) { navigate({ to: "/auth" }); return; }
                    voteMut.mutate(e.id);
                  }}
                  className="tap mr-2 shrink-0 rounded-full px-3 py-1.5 mono-tag"
                  style={{
                    background: voted ? "var(--color-neon)" : "transparent",
                    color: voted ? "var(--color-obsidian)" : "var(--color-neon)",
                    border: `1px solid var(--color-neon)`,
                    fontSize: 10, letterSpacing: "0.14em",
                  }}
                >
                  ▲ {e.votes_count}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
