import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createChallenge, getCommunityBySlug } from "@/lib/communities.functions";

export const Route = createFileRoute("/_authenticated/communities/$slug/challenges/new")({
  head: () => ({
    meta: [
      { title: "New Challenge · ZOMBIEREX Communities" },
      { name: "description", content: "Launch a weekly community challenge for your club." },
      { property: "og:title", content: "New Challenge · ZOMBIEREX Communities" },
      { property: "og:description", content: "Launch a weekly community challenge for your club." },
    ],
  }),
  component: NewChallenge,
});

function NewChallenge() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [prize, setPrize] = useState("");
  const [cover, setCover] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const fetchC = useServerFn(getCommunityBySlug);
  const create = useServerFn(createChallenge);
  const { data } = useQuery({
    queryKey: ["community", slug],
    queryFn: () => fetchC({ data: { slug } }),
  });

  const mut = useMutation({
    mutationFn: () =>
      create({
        data: {
          club_id: data!.club.id,
          title,
          description: description || undefined,
          hashtag: hashtag || undefined,
          prize: prize || undefined,
          cover_url: cover || undefined,
          ends_at: new Date(endsAt).toISOString(),
        },
      }),
    onSuccess: () => navigate({ to: "/communities/$slug", params: { slug } }),
  });

  return (
    <div className="pb-24">
      <div className="px-4 pt-4">
        <Link
          to="/communities/$slug"
          params={{ slug }}
          className="mono-tag"
          style={{ color: "var(--color-titanium)" }}
        >
          ← Back
        </Link>
        <h1 className="serif mt-2 text-[26px] italic" style={{ color: "var(--color-ink)" }}>
          Weekly challenge
        </h1>
        <p className="mono-tag mt-1" style={{ color: "var(--color-titanium)" }}>
          in {data?.club.name ?? slug}
        </p>

        <div className="mt-6 space-y-4">
          <F label="Title">
            <I v={title} on={setTitle} p="Best Sunset Shot" />
          </F>
          <F label="Hashtag">
            <I v={hashtag} on={setHashtag} p="#sunsetrex" />
          </F>
          <F label="Prize">
            <I v={prize} on={setPrize} p="Featured on the home masthead" />
          </F>
          <F label="Cover URL">
            <I v={cover} on={setCover} p="https://…" />
          </F>
          <F label="Ends at">
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[12px]"
              style={{
                background: "var(--color-graphite)",
                color: "var(--color-ink)",
                border: "1px solid var(--color-hair)",
              }}
            />
          </F>
          <F label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg px-3 py-2 text-[13px]"
              style={{
                background: "var(--color-graphite)",
                color: "var(--color-ink)",
                border: "1px solid var(--color-hair)",
              }}
            />
          </F>
          {mut.error && (
            <p className="text-[12px]" style={{ color: "#ff8080" }}>
              {(mut.error as Error).message}
            </p>
          )}
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !title || !endsAt}
            className="tap w-full rounded-full py-3 text-[12px] font-bold uppercase tracking-wider"
            style={{
              background: "var(--color-neon)",
              color: "var(--color-obsidian)",
              letterSpacing: "0.14em",
              opacity: mut.isPending ? 0.5 : 1,
            }}
          >
            {mut.isPending ? "Launching…" : "Launch challenge"}
          </button>
        </div>
      </div>
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mono-tag mb-1.5" style={{ color: "var(--color-neon)", fontSize: 10 }}>
        {label}
      </p>
      {children}
    </div>
  );
}
function I({ v, on, p }: { v: string; on: (s: string) => void; p?: string }) {
  return (
    <input
      value={v}
      onChange={(e) => on(e.target.value)}
      placeholder={p}
      className="w-full rounded-lg px-3 py-2 text-[13px]"
      style={{
        background: "var(--color-graphite)",
        color: "var(--color-ink)",
        border: "1px solid var(--color-hair)",
      }}
    />
  );
}
