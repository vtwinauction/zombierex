import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createCommunityPost, getCommunityBySlug } from "@/lib/communities.functions";

export const Route = createFileRoute("/_authenticated/communities/$slug/post/new")({
  head: () => ({ meta: [
    { title: "New Post · ZOMBIEREX Communities" },
    { name: "description", content: "Share an update with your community." },
    { property: "og:title", content: "New Post · ZOMBIEREX Communities" },
    { property: "og:description", content: "Share an update with your community." },
  ] }),
  component: NewPost,
});

function NewPost() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState("");
  const [announcement, setAnnouncement] = useState(false);

  const fetchC = useServerFn(getCommunityBySlug);
  const post = useServerFn(createCommunityPost);
  const { data } = useQuery({ queryKey: ["community", slug], queryFn: () => fetchC({ data: { slug } }) });

  const mut = useMutation({
    mutationFn: () => post({ data: {
      club_id: data!.club.id,
      caption: caption || undefined,
      media_url: media || undefined,
      thumbnail_url: media || undefined,
      kind: media ? "photo" : "photo",
      is_announcement: announcement,
    } }),
    onSuccess: () => navigate({ to: "/communities/$slug", params: { slug } }),
  });

  return (
    <div className="pb-24">
      <div className="px-4 pt-4">
        <Link to="/communities/$slug" params={{ slug }} className="mono-tag" style={{ color: "var(--color-titanium)" }}>← Back</Link>
        <h1 className="serif mt-2 text-[26px] italic" style={{ color: "var(--color-ink)" }}>New post</h1>
        <p className="mono-tag mt-1" style={{ color: "var(--color-titanium)" }}>in {data?.club.name ?? slug}</p>

        <div className="mt-6 space-y-4">
          <Field label="Caption">
            <textarea
              value={caption} onChange={(e) => setCaption(e.target.value)}
              rows={5} maxLength={2200}
              placeholder="Say something to the crew…"
              className="w-full resize-none rounded-lg px-3 py-2 text-[13px]"
              style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair)" }}
            />
          </Field>
          <Field label="Image URL (optional)">
            <input
              value={media} onChange={(e) => setMedia(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg px-3 py-2 text-[12px]"
              style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair)" }}
            />
          </Field>
          <label className="flex items-center gap-2 text-[12px]" style={{ color: "var(--color-ink)" }}>
            <input type="checkbox" checked={announcement} onChange={(e) => setAnnouncement(e.target.checked)} />
            Mark as announcement (staff only)
          </label>

          {mut.error && <p className="text-[12px]" style={{ color: "#ff8080" }}>{(mut.error as Error).message}</p>}

          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || (!caption && !media)}
            className="tap w-full rounded-full py-3 text-[12px] font-bold uppercase tracking-wider"
            style={{ background: "var(--color-neon)", color: "var(--color-obsidian)", letterSpacing: "0.14em", opacity: mut.isPending ? 0.5 : 1 }}
          >
            {mut.isPending ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mono-tag mb-1.5" style={{ color: "var(--color-neon)", fontSize: 10 }}>{label}</p>
      {children}
    </div>
  );
}
