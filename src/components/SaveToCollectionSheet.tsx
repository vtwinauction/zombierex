import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listMyCollections,
  createCollection,
  addPostToCollection,
  removePostFromCollection,
} from "@/lib/collections.functions";

type Collection = { id: string; name: string; item_count: number };

/**
 * Bottom sheet that lets a rider file a saved post into one or more collections.
 * Opened from the Save action (long-press) or from the post detail menu.
 */
export function SaveToCollectionSheet({
  postId,
  open,
  onClose,
}: {
  postId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fetchCollections = useServerFn(listMyCollections);
  const createCol = useServerFn(createCollection);
  const addTo = useServerFn(addPostToCollection);
  const removeFrom = useServerFn(removePostFromCollection);

  const [newName, setNewName] = useState("");
  const [chosen, setChosen] = useState<Record<string, boolean>>({});

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["collections", "mine"],
    queryFn: () => fetchCollections({}) as Promise<Collection[]>,
    enabled: open,
    staleTime: 60_000,
  });

  const create = useMutation({
    mutationFn: async (name: string) => createCol({ data: { name, sort_order: 0 } }),
    onSuccess: () => {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["collections", "mine"] });
      toast.success("Collection created");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not create collection"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) =>
      on
        ? addTo({ data: { collection_id: id, post_id: postId } })
        : removeFrom({ data: { collection_id: id, post_id: postId } }),
    onError: (e: any) => toast.error(e?.message ?? "Could not update collection"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections", "mine"] }),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end" role="dialog" aria-modal="true" aria-label="Save to collection">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)" }}
      />
      <div
        className="relative w-full max-h-[75svh] overflow-auto"
        style={{ background: "var(--color-obsidian)", borderTop: "1px solid var(--color-hair-strong)" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
          style={{ background: "var(--color-obsidian)", borderBottom: "1px solid var(--color-hair-strong)" }}>
          <p className="mono-caps text-[11px] font-bold" style={{ color: "var(--color-neon)" }}>
            SAVE TO COLLECTION
          </p>
          <button onClick={onClose} className="tap mono-caps text-[10px] font-bold text-white/70">DONE</button>
        </div>

        <div className="flex gap-2 p-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New collection name"
            aria-label="New collection name"
            className="flex-1 bg-graphite p-3 text-sm text-white border border-white/10"
          />
          <button
            onClick={() => newName.trim() && create.mutate(newName.trim())}
            disabled={!newName.trim() || create.isPending}
            className="tap mono-caps text-[10px] font-bold px-3 disabled:opacity-40"
            style={{ background: "var(--color-neon)", color: "var(--color-obsidian)" }}
          >
            ADD
          </button>
        </div>

        <div className="px-4 pb-8 space-y-2">
          {isLoading && (
            <p className="mono-tag" style={{ color: "var(--color-titanium)", fontSize: 10 }}>LOADING…</p>
          )}
          {!isLoading && collections.length === 0 && (
            <p className="mono-tag" style={{ color: "var(--color-titanium)", fontSize: 10 }}>
              NO COLLECTIONS YET · CREATE ONE ABOVE
            </p>
          )}
          {collections.map((c) => {
            const on = !!chosen[c.id];
            return (
              <button
                key={c.id}
                onClick={() => {
                  setChosen((p) => ({ ...p, [c.id]: !on }));
                  toggle.mutate({ id: c.id, on: !on });
                }}
                aria-pressed={on}
                className="tap flex w-full items-center gap-3 border p-3 text-left"
                style={{
                  background: "var(--color-graphite)",
                  borderColor: on ? "var(--color-neon)" : "var(--color-hair-strong)",
                }}
              >
                <span
                  className="mono-caps text-[10px] font-bold"
                  style={{ color: on ? "var(--color-neon)" : "var(--color-titanium)" }}
                >
                  {on ? "✓" : "+"}
                </span>
                <span className="flex-1 truncate text-sm text-white">{c.name}</span>
                <span className="mono-num text-[10px]" style={{ color: "var(--color-titanium)" }}>
                  {c.item_count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
