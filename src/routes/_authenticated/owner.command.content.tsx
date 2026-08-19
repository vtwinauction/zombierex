import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { contentUpsertArticle, contentUpsertBanner, contentWorkspace } from "@/lib/command.functions";
import { Empty, Panel, Pill, Table, Td, inputStyle, statusTone, when } from "@/components/command/ui";

export const Route = createFileRoute("/_authenticated/owner/command/content")({
  head: () => ({
    meta: [
      { title: "Content · Mission Control · ZOMBIEREX" },
      { name: "description", content: "Manage homepage banners, featured slots and editorial articles." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Content · Mission Control" },
      { property: "og:description", content: "ZOMBIEREX content management." },
    ],
  }),
  component: ContentPage,
});

function ContentPage() {
  const qc = useQueryClient();
  const load = useServerFn(contentWorkspace);
  const banner = useServerFn(contentUpsertBanner);
  const article = useServerFn(contentUpsertArticle);

  const q = useQuery({ queryKey: ["command", "content"], queryFn: () => load({ data: undefined as never }), retry: false });
  const [b, setB] = useState({ slot: "home_hero", title: "", subtitle: "", image_url: "", link_url: "" });
  const [a, setA] = useState({ slug: "", title: "", excerpt: "", body: "" });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["command", "content"] });

  const bm = useMutation({
    mutationFn: () =>
      banner({ data: { ...b, image_url: b.image_url || "", is_active: true, sort: 0 } }),
    onSuccess: () => {
      toast.success("Banner published");
      setB({ slot: "home_hero", title: "", subtitle: "", image_url: "", link_url: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const am = useMutation({
    mutationFn: (status: "draft" | "published") => article({ data: { ...a, status, cover_url: "" } }),
    onSuccess: () => {
      toast.success("Article saved");
      setA({ slug: "", title: "", excerpt: "", body: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <p className="text-sm opacity-60">Loading content workspace…</p>;
  if (q.error) return <p className="text-sm" style={{ color: "var(--color-heat)" }}>{String((q.error as Error).message)}</p>;
  const d = q.data!;

  return (
    <div className="space-y-5">
      <div>
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ CONTENT</p>
        <h1 className="text-2xl font-semibold">Banners & editorial</h1>
      </div>

      <Panel tag="BANNER" title="Publish a promotional slot">
        <div className="grid gap-2 sm:grid-cols-3">
          <input style={inputStyle} placeholder="Slot (home_hero)" value={b.slot} onChange={(e) => setB({ ...b, slot: e.target.value })} />
          <input style={inputStyle} placeholder="Title" value={b.title} onChange={(e) => setB({ ...b, title: e.target.value })} />
          <input style={inputStyle} placeholder="Subtitle" value={b.subtitle} onChange={(e) => setB({ ...b, subtitle: e.target.value })} />
          <input style={inputStyle} placeholder="Image URL" value={b.image_url} onChange={(e) => setB({ ...b, image_url: e.target.value })} />
          <input style={inputStyle} placeholder="Link URL" value={b.link_url} onChange={(e) => setB({ ...b, link_url: e.target.value })} />
          <button className="btn-solid text-xs" disabled={!b.title.trim() || bm.isPending} onClick={() => bm.mutate()}>Publish banner</button>
        </div>
        <div className="mt-3">
          {d.banners.length === 0 ? <Empty label="No banners" /> : (
            <Table head={["Slot", "Title", "Active", "Link"]}>
              {(d.banners as any[]).map((x) => (
                <tr key={x.id}>
                  <Td><span className="mono-tag text-[11px]">{x.slot}</span></Td>
                  <Td>{x.title}</Td>
                  <Td><Pill tone={x.is_active ? "ok" : "muted"}>{x.is_active ? "LIVE" : "OFF"}</Pill></Td>
                  <Td><span className="truncate text-[11px]">{x.link_url ?? "—"}</span></Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Panel>

      <Panel tag="EDITORIAL" title="Articles & announcements">
        <div className="grid gap-2 sm:grid-cols-2">
          <input style={inputStyle} placeholder="slug-in-lowercase" value={a.slug} onChange={(e) => setA({ ...a, slug: e.target.value })} />
          <input style={inputStyle} placeholder="Title" value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} />
        </div>
        <input className="mt-2" style={inputStyle} placeholder="Excerpt" value={a.excerpt} onChange={(e) => setA({ ...a, excerpt: e.target.value })} />
        <textarea className="mt-2" style={{ ...inputStyle, minHeight: 120 }} placeholder="Body" value={a.body} onChange={(e) => setA({ ...a, body: e.target.value })} />
        <div className="mt-2 flex gap-2">
          <button className="btn-ghost text-xs" disabled={am.isPending || !a.slug || !a.title} onClick={() => am.mutate("draft")}>Save draft</button>
          <button className="btn-solid text-xs" disabled={am.isPending || !a.slug || !a.title} onClick={() => am.mutate("published")}>Publish</button>
        </div>
        <div className="mt-3">
          {d.articles.length === 0 ? <Empty label="No articles" /> : (
            <Table head={["Title", "Slug", "Status", "Updated"]}>
              {(d.articles as any[]).map((x) => (
                <tr key={x.id}>
                  <Td><span className="truncate text-[13px]">{x.title}</span></Td>
                  <Td><span className="mono-tag text-[10px]">{x.slug}</span></Td>
                  <Td><Pill tone={statusTone(x.status)}>{x.status}</Pill></Td>
                  <Td><span className="text-[11px]">{when(x.updated_at ?? x.created_at)}</span></Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Panel>
    </div>
  );
}
