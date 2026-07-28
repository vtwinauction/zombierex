import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listMySavedPosts } from "@/lib/feed.functions";
import {
  listMyCollections,
  createCollection,
  deleteCollection,
  addPostToCollection,
  removePostFromCollection,
  listSavedPostsInCollection,
} from "@/lib/collections.functions";
import { PullToRefresh } from "@/components/PullToRefresh";
import { confirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({
    meta: [
      { title: "Saved · ZOMBIEREX" },
      { name: "description", content: "Posts you've bookmarked and organized into collections." },
      { property: "og:title", content: "Saved · ZOMBIEREX" },
      { property: "og:description", content: "Your bookmarked signal, organized." },
    ],
  }),
  component: SavedPage,
});

type Post = {
  id: string;
  kind: string;
  caption: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author?: { display_name?: string | null; handle?: string | null; avatar_url?: string | null } | null;
};

type Collection = {
  id: string;
  name: string;
  sort_order: number;
  item_count: number;
};

function SavedPage() {
  const qc = useQueryClient();
  const fetchSaved = useServerFn(listMySavedPosts);
  const fetchCollections = useServerFn(listMyCollections);
  const fetchCollectionPosts = useServerFn(listSavedPostsInCollection);
  const createCol = useServerFn(createCollection);
  const deleteCol = useServerFn(deleteCollection);
  const addToCol = useServerFn(addPostToCollection);
  const removeFromCol = useServerFn(removePostFromCollection);

  const [activeId, setActiveId] = useState<string | "all">("all");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [postMenuId, setPostMenuId] = useState<string | null>(null);

  const savedQ = useQuery({
    queryKey: ["saved-posts"],
    queryFn: () => fetchSaved({}) as Promise<Post[]>,
    staleTime: 30_000,
  });

  const collectionsQ = useQuery({
    queryKey: ["saved-collections"],
    queryFn: () => fetchCollections({}) as Promise<Collection[]>,
    staleTime: 30_000,
  });

  const collectionPostsQ = useQuery({
    queryKey: ["saved-posts", "collection", activeId],
    queryFn: () => fetchCollectionPosts({ data: { collection_id: activeId as string } }) as Promise<Post[]>,
    enabled: activeId !== "all" && typeof activeId === "string",
    staleTime: 30_000,
  });

  const rows = activeId === "all" ? (savedQ.data ?? []) : (collectionPostsQ.data ?? []);
  const isLoading = activeId === "all" ? savedQ.isLoading : collectionPostsQ.isLoading;

  const createMut = useMutation({
    mutationFn: (name: string) => createCol({ data: { name, sort_order: (collectionsQ.data?.length ?? 0) } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-collections"] });
      setIsAdding(false);
      setNewName("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCol({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-collections"] });
      if (activeId !== "all") setActiveId("all");
    },
  });

  const addMut = useMutation({
    mutationFn: ({ postId, collectionId }: { postId: string; collectionId: string }) =>
      addToCol({ data: { post_id: postId, collection_id: collectionId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-collections"] }),
  });

  const removeMut = useMutation({
    mutationFn: ({ postId, collectionId }: { postId: string; collectionId: string }) =>
      removeFromCol({ data: { post_id: postId, collection_id: collectionId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-collections"] });
      qc.invalidateQueries({ queryKey: ["saved-posts", "collection", activeId] });
    },
  });

  const activeCollection = useMemo(
    () => collectionsQ.data?.find((c) => c.id === activeId),
    [collectionsQ.data, activeId],
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createMut.mutate(newName.trim());
  }

  async function handleDeleteCollection(id: string, name: string) {
    const ok = await confirmDialog({
      title: "DELETE COLLECTION",
      description: `Permanently delete "${name}"? Saved posts themselves will remain in your All Saved list.`,
      confirmLabel: "DELETE",
      destructive: true,
    });
    if (ok) deleteMut.mutate(id);
  }

  function handleAddToCollection(postId: string, collectionId: string) {
    addMut.mutate({ postId, collectionId });
    setPostMenuId(null);
  }

  function handleRemoveFromCollection(postId: string) {
    if (activeId === "all" || !activeId) return;
    removeMut.mutate({ postId, collectionId: activeId });
    setPostMenuId(null);
  }

  const collections = collectionsQ.data ?? [];

  return (
    <PullToRefresh onRefresh={() => Promise.all([
      qc.invalidateQueries({ queryKey: ["saved-posts"] }),
      qc.invalidateQueries({ queryKey: ["saved-collections"] }),
      qc.invalidateQueries({ queryKey: ["saved-posts", "collection", activeId] }),
    ])}>
      <div className="px-4 pt-6 pb-24">
        <p className="mono-tag">VAULT · {rows.length} ITEMS</p>
        <h1 className="mt-2 display-xl text-5xl uppercase">Saved</h1>

        {/* Collection tabs */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveId("all")}
            className="tap mono-tag shrink-0 px-3 py-1.5 hairline"
            style={{
              background: activeId === "all" ? "var(--color-ink)" : "transparent",
              color: activeId === "all" ? "var(--color-bone)" : "var(--color-ash)",
            }}
          >
            ALL
          </button>
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className="tap mono-tag shrink-0 px-3 py-1.5 hairline flex items-center gap-2"
              style={{
                background: activeId === c.id ? "var(--color-ink)" : "transparent",
                color: activeId === c.id ? "var(--color-bone)" : "var(--color-ash)",
              }}
            >
              {c.name}
              <span className="mono-num text-[10px] opacity-70">{c.item_count}</span>
            </button>
          ))}
          <button
            onClick={() => setIsAdding(true)}
            className="tap mono-tag shrink-0 px-3 py-1.5"
            style={{ color: "var(--color-neon)", border: "1px dashed rgba(0,200,83,0.45)" }}
          >
            + NEW
          </button>
        </div>

        {/* Active collection header */}
        {activeId !== "all" && activeCollection && (
          <div className="mt-4 flex items-center justify-between hairline-t hairline-b px-2 py-3" style={{ background: "var(--color-mist)" }}>
            <div>
              <p className="mono-tag" style={{ color: "var(--color-ash)" }}>COLLECTION</p>
              <p className="text-sm font-semibold">{activeCollection.name}</p>
            </div>
            <button
              onClick={() => handleDeleteCollection(activeCollection.id, activeCollection.name)}
              className="tap mono-tag px-2 py-1 text-[10px]"
              style={{ color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.35)" }}
            >
              DELETE
            </button>
          </div>
        )}

        {/* New collection form */}
        {isAdding && (
          <form onSubmit={handleCreate} className="mt-4 flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Collection name"
              maxLength={120}
              className="flex-1 bg-transparent hairline px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--color-neon)]"
              style={{ color: "var(--color-bone)" }}
              autoFocus
            />
            <button
              type="submit"
              disabled={!newName.trim() || createMut.isPending}
              className="tap mono-tag px-3 py-2 disabled:opacity-40"
              style={{ background: "var(--color-neon)", color: "var(--color-ink)" }}
            >
              CREATE
            </button>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setNewName(""); }}
              className="tap mono-tag px-3 py-2"
              style={{ color: "var(--color-ash)" }}
            >
              CANCEL
            </button>
          </form>
        )}

        {isLoading && <p className="mono-tag mt-10 text-center" style={{ color: "var(--color-ash)" }}>LOADING…</p>}

        {!isLoading && rows.length === 0 && (
          <div className="mt-16 text-center">
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>NO SAVES YET</p>
            <p className="mt-2 text-[13px]" style={{ color: "var(--color-ash)" }}>
              {activeId === "all"
                ? "Tap the bookmark on any post to stash it here."
                : "This collection is empty. Add posts from your All Saved list."}
            </p>
            {activeId === "all" && (
              <Link to="/" className="btn-solid mt-6 inline-block mono-tag">OPEN FEED</Link>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <ul className="mt-6 grid grid-cols-3 gap-1">
            {rows.map((p) => (
              <li key={p.id} className="relative aspect-square overflow-hidden hairline">
                <Link to="/p/$id" params={{ id: p.id }} className="block h-full w-full">
                  <PostThumb post={p} />
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); setPostMenuId(postMenuId === p.id ? null : p.id); }}
                  className="tap absolute right-1 top-1 h-7 w-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.55)" }}
                  aria-label="Collection options"
                >
                  <span style={{ color: "#fff", fontSize: 12 }}>⋯</span>
                </button>
                {postMenuId === p.id && (
                  <div
                    className="absolute right-1 top-9 z-20 w-48 hairline py-1"
                    style={{ background: "var(--color-ink)" }}
                  >
                    {activeId !== "all" && (
                      <button
                        onClick={(e) => { e.preventDefault(); handleRemoveFromCollection(p.id); }}
                        className="tap w-full px-3 py-2 text-left text-[12px]"
                        style={{ color: "#ff6b6b" }}
                      >
                        Remove from collection
                      </button>
                    )}
                    {collections
                      .filter((c) => c.id !== activeId)
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={(e) => { e.preventDefault(); handleAddToCollection(p.id, c.id); }}
                          className="tap w-full px-3 py-2 text-left text-[12px]"
                          style={{ color: "var(--color-bone)" }}
                        >
                          Add to “{c.name}”
                        </button>
                      ))}
                    {collections.filter((c) => c.id !== activeId).length === 0 && activeId === "all" && (
                      <p className="px-3 py-2 text-[11px]" style={{ color: "var(--color-ash)" }}>No collections yet</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PullToRefresh>
  );
}

function PostThumb({ post }: { post: Post }) {
  const src = post.thumbnail_url ?? post.media_url ?? "";
  if (!src) {
    return (
      <div className="grid h-full w-full place-items-center" style={{ background: "var(--color-mist)" }}>
        <p className="mono-tag px-2 text-center line-clamp-3" style={{ color: "var(--color-ash)" }}>
          {(post.caption ?? "POST").slice(0, 60)}
        </p>
      </div>
    );
  }
  if (src.match(/\.(mp4|webm|mov)(\?|$)/i)) {
    return <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
  }
  return <img src={src} alt={post.caption ?? "Saved post"} className="h-full w-full object-cover" loading="lazy" />;
}
