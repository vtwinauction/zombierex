import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyPosts, deletePost } from "@/lib/feed.functions";

export const Route = createFileRoute("/_authenticated/posts/mine")({
  head: () => ({
    meta: [
      { title: "My posts · ZOMBIEREX" },
      { name: "description", content: "Edit or delete posts you have published." },
    ],
  }),
  component: MyPostsPage,
});

function MyPostsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listMyPosts);
  const delFn = useServerFn(deletePost);

  const q = useQuery({ queryKey: ["posts", "mine"], queryFn: () => fetchList(), retry: false });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts", "mine"] }),
  });

  return (
    <div className="pb-24" style={{ background: "var(--color-paper-1)" }}>
      <header className="px-4 pt-4">
        <Link to="/profile" className="mono-tag" style={{ color: "var(--color-ink-3)" }}>← Back</Link>
        <h1 className="serif mt-2 text-3xl" style={{ color: "var(--color-ink-0)" }}>My posts</h1>
      </header>

      <div className="mt-4 space-y-2 px-4">
        {q.isLoading && <p className="mono-tag" style={{ color: "var(--color-ink-3)" }}>Loading…</p>}
        {q.data?.length === 0 && (
          <p className="text-[13px]" style={{ color: "var(--color-ink-3)" }}>
            You haven’t posted anything yet. <Link to="/post/new" style={{ color: "var(--color-neon)" }}>Create one</Link>.
          </p>
        )}
        {q.data?.map((p) => (
          <article
            key={p.id}
            className="flex gap-3 rounded-xl p-3"
            style={{ background: "var(--color-paper-0)", border: "1px solid var(--color-line)" }}
          >
            <div
              className="h-16 w-16 shrink-0 overflow-hidden rounded-lg"
              style={{ background: "var(--color-paper-2)" }}
            >
              {(p.thumbnail_url || p.media_url) && (
                <img src={p.thumbnail_url || p.media_url || ""} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>
                {p.kind?.toUpperCase()} · {new Date(p.created_at).toLocaleDateString()}
              </p>
              <p className="mt-1 line-clamp-2 text-[13px]" style={{ color: "var(--color-ink-0)" }}>
                {p.caption || <span style={{ color: "var(--color-ink-3)" }}>No caption</span>}
              </p>
              <div className="mt-2 flex gap-2">
                <Link
                  to="/post/$id/edit"
                  params={{ id: p.id }}
                  className="tap rounded-md px-3 py-1 text-[11px] font-semibold"
                  style={{ background: "var(--color-ink-0)", color: "var(--color-paper-0)" }}
                >
                  Edit
                </Link>
                <button
                  onClick={() => {
                    if (confirm("Delete this post? This cannot be undone.")) del.mutate(p.id);
                  }}
                  className="tap rounded-md px-3 py-1 text-[11px] font-semibold"
                  style={{ border: "1px solid rgba(255,80,80,0.5)", color: "#ff6b6b" }}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
