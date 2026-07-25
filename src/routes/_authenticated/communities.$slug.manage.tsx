import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getCommunityBySlug, decideRequest, setMemberRole, removeMember, pinPost, deleteCommunityPost,
  awardBadge,
} from "@/lib/communities.functions";
import { useEffect, useState } from "react";

const BADGE_PRESETS = [
  { code: "top_rider", label: "Top Rider" },
  { code: "featured_build", label: "Featured Build" },
  { code: "milestone", label: "Milestone" },
  { code: "event_champ", label: "Event Champ" },
];


export const Route = createFileRoute("/_authenticated/communities/$slug/manage")({
  head: ({ params }) => ({ meta: [{ title: `Manage ${params.slug} · ZOMBIEREX` }] }),
  component: ManageCommunity,
});

type Member = { user_id: string; role: string; joined_at: string };
type Request = { id: string; user_id: string; message: string | null; created_at: string; status: string };

function ManageCommunity() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const fetchCommunity = useServerFn(getCommunityBySlug);
  const decide = useServerFn(decideRequest);
  const setRole = useServerFn(setMemberRole);
  const kick = useServerFn(removeMember);
  const pin = useServerFn(pinPost);
  const del = useServerFn(deleteCommunityPost);
  const award = useServerFn(awardBadge);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);


  const { data: community } = useQuery({
    queryKey: ["community", slug],
    queryFn: () => fetchCommunity({ data: { slug } }),
  });

  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    if (!community?.club.id) return;
    const clubId = community.club.id;
    (async () => {
      const [{ data: m }, { data: r }] = await Promise.all([
        supabase.from("club_members").select("user_id, role, joined_at").eq("club_id", clubId),
        supabase.from("club_join_requests").select("id, user_id, message, created_at, status").eq("club_id", clubId).eq("status", "pending"),
      ]);
      setMembers((m as Member[]) ?? []);
      setRequests((r as Request[]) ?? []);
    })();
  }, [community?.club.id]);

  const refreshLists = async () => {
    if (!community?.club.id) return;
    const [{ data: m }, { data: r }] = await Promise.all([
      supabase.from("club_members").select("user_id, role, joined_at").eq("club_id", community.club.id),
      supabase.from("club_join_requests").select("id, user_id, message, created_at, status").eq("club_id", community.club.id).eq("status", "pending"),
    ]);
    setMembers((m as Member[]) ?? []);
    setRequests((r as Request[]) ?? []);
  };

  const decideMut = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) => decide({ data: { request_id: v.id, approve: v.approve } }),
    onSuccess: refreshLists,
  });
  const roleMut = useMutation({
    mutationFn: (v: { user_id: string; role: "moderator" | "member" }) =>
      setRole({ data: { club_id: community!.club.id, ...v } }),
    onSuccess: refreshLists,
  });
  const kickMut = useMutation({
    mutationFn: (user_id: string) => kick({ data: { club_id: community!.club.id, user_id } }),
    onSuccess: refreshLists,
  });
  const pinMut = useMutation({
    mutationFn: (v: { post_id: string; pinned: boolean }) => pin({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", slug] }),
  });
  const delMut = useMutation({
    mutationFn: (post_id: string) => del({ data: { post_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", slug] }),
  });
  const awardMut = useMutation({
    mutationFn: (v: { user_id: string; code: string; label: string }) =>
      award({ data: { club_id: community!.club.id, ...v } }),
    onSuccess: (_, v) => {
      setPickerFor(null);
      setToast(`🏅 ${v.label} awarded`);
      setTimeout(() => setToast(null), 2000);
      qc.invalidateQueries({ queryKey: ["community-badges", community?.club.id] });
    },
  });


  if (!community) {
    return <div className="grid min-h-[50vh] place-items-center"><p className="mono-tag" style={{ color: "var(--color-titanium)" }}>loading…</p></div>;
  }

  return (
    <div className="pb-24">

      <div className="flex items-baseline justify-between px-4 pt-6">
        <div>
          <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{community.club.name}</p>
          <h1 className="serif text-[28px] italic" style={{ color: "var(--color-ink)" }}>Command deck</h1>
        </div>
        <Link to="/communities/$slug" params={{ slug }} className="mono-tag" style={{ color: "var(--color-neon)" }}>← Public view</Link>
      </div>

      <Section title={`Join requests · ${requests.length}`}>
        {requests.length === 0 && <Empty>No pending requests.</Empty>}
        {requests.map((r) => (
          <Row key={r.id}>
            <div className="min-w-0 flex-1">
              <p className="mono-num text-[11px]" style={{ color: "var(--color-ink)" }}>{r.user_id.slice(0, 8)}</p>
              {r.message && <p className="text-[12px]" style={{ color: "var(--color-titanium)" }}>"{r.message}"</p>}
            </div>
            <button className={btnDanger} onClick={() => decideMut.mutate({ id: r.id, approve: false })}>Reject</button>
            <button className={btnPrimary} onClick={() => decideMut.mutate({ id: r.id, approve: true })}>Approve</button>
          </Row>
        ))}
      </Section>

      <Section title={`Members · ${members.length}`}>
        {members.map((m) => (
          <div key={m.user_id}>
            <Row>
              <div className="min-w-0 flex-1">
                <p className="mono-num text-[11px]" style={{ color: "var(--color-ink)" }}>{m.user_id.slice(0, 8)}</p>
                <p className="mono-tag" style={{ color: "var(--color-neon)", fontSize: 9 }}>{m.role.toUpperCase()}</p>
              </div>
              <button className={btnGhost} onClick={() => setPickerFor(pickerFor === m.user_id ? null : m.user_id)}>
                🏅 Badge
              </button>
              {m.role !== "owner" && (
                <>
                  {m.role === "moderator" ? (
                    <button className={btnGhost} onClick={() => roleMut.mutate({ user_id: m.user_id, role: "member" })}>Demote</button>
                  ) : (
                    <button className={btnGhost} onClick={() => roleMut.mutate({ user_id: m.user_id, role: "moderator" })}>Promote</button>
                  )}
                  <button className={btnDanger} onClick={() => kickMut.mutate(m.user_id)}>Remove</button>
                </>
              )}
            </Row>
            {pickerFor === m.user_id && (
              <div className="mt-1.5 flex flex-wrap gap-1.5 rounded-lg px-3 py-2"
                style={{ background: "var(--color-obsidian)", border: "1px solid var(--color-hair-strong)" }}>
                {BADGE_PRESETS.map((b) => (
                  <button key={b.code} className={btnGhost}
                    onClick={() => awardMut.mutate({ user_id: m.user_id, code: b.code, label: b.label })}>
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </Section>

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-max rounded-full px-4 py-2 mono-tag"
          style={{ background: "var(--color-neon)", color: "var(--color-obsidian)", fontSize: 10, letterSpacing: "0.14em" }}>
          {toast}
        </div>
      )}


      <Section title="Recent posts">
        {community.posts.length === 0 && <Empty>No posts yet.</Empty>}
        {[...community.pinned, ...community.posts].map((p) => (
          <Row key={p.id}>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[12px]" style={{ color: "var(--color-ink)" }}>{p.caption ?? "(no caption)"}</p>
              <p className="mono-tag" style={{ color: "var(--color-titanium)", fontSize: 9 }}>{new Date(p.created_at).toLocaleDateString()}</p>
            </div>
            <button className={btnGhost} onClick={() => pinMut.mutate({ post_id: p.id, pinned: !p.is_pinned })}>
              {p.is_pinned ? "Unpin" : "Pin"}
            </button>
            <button className={btnDanger} onClick={() => delMut.mutate(p.id)}>Delete</button>
          </Row>
        ))}
      </Section>
    </div>
  );
}

const baseBtn = "tap rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider";
const btnPrimary = `${baseBtn} bg-[var(--color-neon)] text-[var(--color-obsidian)]`;
const btnGhost = `${baseBtn} bg-transparent text-[var(--color-ink)] border border-[var(--color-hair-strong)]`;
const btnDanger = `${baseBtn} bg-transparent text-[#ff8080] border border-[rgba(255,80,80,0.4)]`;


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 px-4">
      <h2 className="mono-tag mb-2" style={{ color: "var(--color-neon)", fontSize: 10, letterSpacing: "0.16em" }}>{title.toUpperCase()}</h2>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2"
      style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)" }}
    >
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg px-3 py-4 text-center" style={{ background: "var(--color-graphite)", border: "1px dashed var(--color-hair-strong)" }}>
      <p className="mono-tag" style={{ color: "var(--color-titanium)", fontSize: 10 }}>{children}</p>
    </div>
  );
}
