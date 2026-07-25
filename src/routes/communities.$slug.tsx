import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getCommunityBySlug, joinCommunity, leaveCommunity, listChallenges, listCommunityBadges } from "@/lib/communities.functions";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const Route = createFileRoute("/communities/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} · Community · ZOMBIEREX` },
      { name: "description", content: `Feed, events and members of the ${params.slug} community on ZOMBIEREX.` },
    ],
  }),
  component: CommunityDetail,
});

const TABS = ["Feed", "Events", "Challenges", "Members", "About"] as const;


function CommunityDetail() {
  const { slug } = Route.useParams();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Feed");
  const [userId, setUserId] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (mounted) setUserId(data.user?.id ?? null); });
    return () => { mounted = false; };
  }, []);

  const fetchCommunity = useServerFn(getCommunityBySlug);
  const join = useServerFn(joinCommunity);
  const leave = useServerFn(leaveCommunity);

  const { data, isPending } = useQuery({
    queryKey: ["community", slug],
    queryFn: () => fetchCommunity({ data: { slug } }),
  });

  const joinMut = useMutation({
    mutationFn: () => join({ data: { club_id: data!.club.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", slug] }),
  });
  const leaveMut = useMutation({
    mutationFn: () => leave({ data: { club_id: data!.club.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", slug] }),
  });

  const clubId = data?.club.id;

  // Realtime: refresh feed when a new post lands in this club
  useEffect(() => {
    if (!clubId) return;
    const ch = supabase
      .channel(`club-${clubId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "posts", filter: `club_id=eq.${clubId}` },
        () => { qc.invalidateQueries({ queryKey: ["community", slug] }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clubId, qc, slug]);

  const fetchChallenges = useServerFn(listChallenges);
  const fetchBadges = useServerFn(listCommunityBadges);
  const { data: challenges = [] } = useQuery({
    queryKey: ["community-challenges", clubId],
    queryFn: () => fetchChallenges({ data: { club_id: clubId!, active_only: true } }),
    enabled: !!clubId,
  });
  const { data: badges = [] } = useQuery({
    queryKey: ["community-badges", clubId],
    queryFn: () => fetchBadges({ data: { club_id: clubId! } }),
    enabled: !!clubId,
  });


  if (isPending) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>loading community…</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div>
          <p className="serif text-[24px] italic" style={{ color: "var(--color-ink)" }}>Community not found</p>
          <Link to="/communities" className="mono-tag mt-3 inline-block" style={{ color: "var(--color-neon)" }}>← Back to discover</Link>
        </div>
      </div>
    );
  }

  const { club, pinned, posts, events, staff } = data;
  const isOwner = userId === club.owner_id;
  const isStaff = staff.some((s) => s.user_id === userId);

  return (
    <div className="pb-24">

      {/* Cover */}
      <div className="relative">
        <div className="aspect-[16/9] w-full overflow-hidden" style={{ background: "var(--color-graphite)" }}>
          {(club.cover_url || club.banner_url) && (
            <img src={club.cover_url ?? club.banner_url ?? undefined} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, var(--color-obsidian) 100%)" }} />
        </div>

        <div className="absolute inset-x-4 bottom-3 text-white">
          <p className="mono-tag" style={{ color: "rgba(255,255,255,0.8)", fontSize: 9 }}>
            {club.category} · {club.location ?? "Worldwide"}
          </p>
          <h1 className="serif text-[30px] italic leading-tight">{club.name}</h1>
          <p className="mt-1 text-[12px]" style={{ color: "rgba(255,255,255,0.85)" }}>
            {club.members_count.toLocaleString()} operators · {club.is_private ? "Private" : "Public"} · {club.join_policy}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3">
        {userId && !isStaff && (
          <button
            onClick={() => joinMut.mutate()}
            disabled={joinMut.isPending}
            className="tap flex-1 rounded-full py-2 text-[12px] font-bold uppercase tracking-wider"
            style={{ background: "var(--color-neon)", color: "var(--color-obsidian)", letterSpacing: "0.14em" }}
          >
            {joinMut.isPending ? "…" : club.join_policy === "open" ? "+ Join" : "Request access"}
          </button>
        )}
        {isStaff && !isOwner && (
          <button
            onClick={() => leaveMut.mutate()}
            className="tap flex-1 rounded-full py-2 text-[12px] font-bold uppercase tracking-wider"
            style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair-strong)", letterSpacing: "0.14em" }}
          >
            Leave
          </button>
        )}
        {isOwner && (
          <Link
            to="/communities/$slug/manage"
            params={{ slug }}
            className="tap flex-1 rounded-full py-2 text-center text-[12px] font-bold uppercase tracking-wider"
            style={{ background: "var(--color-obsidian)", color: "var(--color-neon)", border: "1px solid var(--color-neon)", letterSpacing: "0.14em" }}
          >
            Manage
          </Link>
        )}
        {!userId && (
          <Link
            to="/auth"
            className="tap flex-1 rounded-full py-2 text-center text-[12px] font-bold uppercase tracking-wider"
            style={{ background: "var(--color-neon)", color: "var(--color-obsidian)", letterSpacing: "0.14em" }}
          >
            Sign in to join
          </Link>
        )}
        <button
          className="tap rounded-full px-4 py-2 text-[11px] font-bold uppercase"
          style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair-strong)" }}
        >
          ⤴
        </button>
      </div>

      {/* Hashtags */}
      {club.hashtags && club.hashtags.length > 0 && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-2">
          {club.hashtags.map((t) => (
            <span
              key={t}
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px]"
              style={{ background: "var(--color-graphite)", color: "var(--color-neon)", border: "1px solid var(--color-hair)" }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+56px)] z-20 flex gap-1 border-y px-4 py-2"
        style={{ background: "color-mix(in oklab, var(--color-obsidian) 82%, transparent)", backdropFilter: "blur(18px)", borderColor: "var(--color-hair)" }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="tap flex-1 rounded-md py-1.5 text-[11px] font-bold uppercase tracking-wider"
            style={{
              background: tab === t ? "var(--color-neon)" : "transparent",
              color: tab === t ? "var(--color-obsidian)" : "var(--color-titanium)",
              letterSpacing: "0.14em",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {tab === "Feed" && (
          <div className="space-y-4">
            {userId && (
              <Link
                to="/communities/$slug/post/new" params={{ slug }}
                className="tap block rounded-xl px-4 py-3 text-[12px] font-bold uppercase tracking-wider"
                style={{ background: "var(--color-obsidian)", color: "var(--color-neon)", border: "1px dashed var(--color-neon)", letterSpacing: "0.14em" }}
              >+ Post to the crew</Link>
            )}
            {pinned.length === 0 && posts.length === 0 && (
              <EmptyState label="No posts yet. Be the first to share." />
            )}
            {pinned.map((p) => <FeedItem key={p.id} p={p} pinned />)}
            {posts.map((p) => <FeedItem key={p.id} p={p} />)}
          </div>
        )}

        {tab === "Events" && (
          <div className="space-y-3">
            {isStaff && (
              <Link to="/communities/$slug/events/new" params={{ slug }}
                className="tap block rounded-xl px-4 py-3 text-[12px] font-bold uppercase tracking-wider"
                style={{ background: "var(--color-obsidian)", color: "var(--color-neon)", border: "1px dashed var(--color-neon)", letterSpacing: "0.14em" }}
              >+ Schedule event</Link>
            )}
            {events.length === 0 && <EmptyState label="No upcoming events yet." />}
            {events.map((e) => (
              <div key={e.id} className="overflow-hidden" style={{ borderRadius: 12, border: "1px solid var(--color-hair)" }}>
                {e.cover_url && <img src={e.cover_url} alt="" className="aspect-[16/9] w-full object-cover" />}
                <div className="p-3" style={{ background: "var(--color-graphite)" }}>
                  <p className="mono-tag" style={{ color: "var(--color-neon)", fontSize: 9 }}>
                    {e.event_type.toUpperCase()} · {new Date(e.starts_at).toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-[14px] font-semibold" style={{ color: "var(--color-ink)" }}>{e.title}</p>
                  <p className="mono-tag mt-1" style={{ color: "var(--color-titanium)", fontSize: 9 }}>
                    ◎ {e.location ?? "TBA"} · {e.rsvp_count} going{e.guest_limit ? ` / ${e.guest_limit}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "Challenges" && (
          <div className="space-y-3">
            {isStaff && (
              <Link to="/communities/$slug/challenges/new" params={{ slug }}
                className="tap block rounded-xl px-4 py-3 text-[12px] font-bold uppercase tracking-wider"
                style={{ background: "var(--color-obsidian)", color: "var(--color-neon)", border: "1px dashed var(--color-neon)", letterSpacing: "0.14em" }}
              >+ Launch weekly challenge</Link>
            )}
            {challenges.length === 0 && <EmptyState label="No active challenges." />}
            {challenges.map((c) => (
              <Link key={c.id} to="/communities/$slug/challenges/$challengeId" params={{ slug, challengeId: c.id }}
                className="tap block overflow-hidden" style={{ borderRadius: 12, border: "1px solid var(--color-hair)", background: "var(--color-graphite)" }}>

                {c.cover_url && <img src={c.cover_url} alt="" className="aspect-[16/9] w-full object-cover" />}
                <div className="p-3">
                  <p className="mono-tag" style={{ color: "var(--color-neon)", fontSize: 9 }}>
                    CHALLENGE · ends {new Date(c.ends_at).toLocaleDateString()}
                  </p>
                  <p className="serif mt-1 text-[18px] italic" style={{ color: "var(--color-ink)" }}>{c.title}</p>
                  {c.description && <p className="mt-1 text-[12px]" style={{ color: "var(--color-titanium)" }}>{c.description}</p>}
                  <div className="mt-2 flex items-center gap-3 mono-tag" style={{ color: "var(--color-titanium)", fontSize: 9 }}>
                    {c.hashtag && <span style={{ color: "var(--color-neon)" }}>{c.hashtag}</span>}
                    <span>{c.entries_count} entries</span>
                    {c.prize && <span>🏆 {c.prize}</span>}
                  </div>
                </div>
              </Link>

            ))}
          </div>
        )}

        {tab === "Members" && (
          <div className="space-y-4">
            {badges.length > 0 && (
              <div>
                <p className="mono-tag mb-2" style={{ color: "var(--color-neon)", fontSize: 10 }}>Leaderboard · recent badges</p>
                <div className="space-y-1.5">
                  {badges.slice(0, 8).map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)" }}>
                      <span className="mono-num text-[11px]" style={{ color: "var(--color-ink)" }}>{b.user_id.slice(0, 8)}</span>
                      <span className="mono-tag" style={{ color: "var(--color-neon)", fontSize: 9 }}>🏅 {b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mono-tag mb-2" style={{ color: "var(--color-neon)", fontSize: 10 }}>Staff</p>
              {staff.length === 0 && <EmptyState label="Staff list is private." />}
              {staff.map((s) => (
                <div key={s.user_id} className="mb-1.5 flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)" }}>
                  <span className="mono-num text-[11px]" style={{ color: "var(--color-ink)" }}>{s.user_id.slice(0, 8)}</span>
                  <span className="mono-tag" style={{ color: "var(--color-neon)", fontSize: 9 }}>{s.role.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        )}


        {tab === "About" && (
          <div className="space-y-4 text-[13px]" style={{ color: "var(--color-ink)" }}>
            {club.description && <p>{club.description}</p>}
            {club.rules && (
              <div>
                <p className="mono-tag mb-1.5" style={{ color: "var(--color-neon)", fontSize: 10 }}>House rules</p>
                <p className="whitespace-pre-line" style={{ color: "var(--color-titanium)" }}>{club.rules}</p>
              </div>
            )}
            <div className="mono-tag" style={{ color: "var(--color-titanium)", fontSize: 9 }}>
              Founded {new Date(club.created_at).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl py-8 text-center" style={{ background: "var(--color-graphite)", border: "1px dashed var(--color-hair-strong)" }}>
      <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{label}</p>
    </div>
  );
}

type FeedPost = {
  id: string;
  caption: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  kind: string;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  is_announcement: boolean;
  created_at: string;
};

function FeedItem({ p, pinned }: { p: FeedPost; pinned?: boolean }) {
  const img = p.thumbnail_url ?? p.media_url;
  return (
    <article
      className="overflow-hidden"
      style={{ borderRadius: 12, border: pinned ? "1px solid var(--color-neon)" : "1px solid var(--color-hair)", background: "var(--color-graphite)" }}
    >
      {pinned && (
        <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: "color-mix(in oklab, var(--color-neon) 12%, transparent)" }}>
          <span className="mono-tag" style={{ color: "var(--color-neon)", fontSize: 9 }}>📌 PINNED</span>
          {p.is_announcement && <span className="mono-tag" style={{ color: "var(--color-ink)", fontSize: 9 }}>· ANNOUNCEMENT</span>}
        </div>
      )}
      {img && <img src={img} alt="" className="aspect-square w-full object-cover" />}
      <div className="p-3">
        {p.caption && <p className="text-[13px]" style={{ color: "var(--color-ink)" }}>{p.caption}</p>}
        <p className="mono-num mt-2 text-[10px]" style={{ color: "var(--color-titanium)" }}>
          ♥ {p.likes_count} · 💬 {p.comments_count}
        </p>
      </div>
    </article>
  );
}
