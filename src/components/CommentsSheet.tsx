import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ReportBlockSheet } from "@/components/ReportBlockSheet";
import { haptic } from "@/lib/native";
import { supabase } from "@/integrations/supabase/client";
import { listComments, addComment, deleteComment } from "@/lib/comments.functions";

export type CommentItem = {
  id: string;
  author: string;
  body: string;
  createdAt: number;
  parentId?: string | null;
  likes?: number;
  likedByMe?: boolean;
  authorId?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


export function CommentsSheet({
  open,
  onClose,
  targetId,
  title = "Comments",
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  targetId: string;
  title?: string;
  onSubmitted?: () => void;
}) {
  const qc = useQueryClient();
  // Strip client prefixes like "db:" so we always work with the raw UUID for DB posts.
  const raw = targetId.startsWith("db:") ? targetId.slice(3) : targetId;
  const isLive = UUID_RE.test(raw);

  const fetchList = useServerFn(listComments);
  const addFn = useServerFn(addComment);
  const delFn = useServerFn(deleteComment);

  const [meId, setMeId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, []);

  const query = useQuery({
    queryKey: ["comments", raw],
    queryFn: () => fetchList({ data: { post_id: raw, limit: 200 } }),
    enabled: open && isLive,
    staleTime: 15_000,
  });

  const [localItems, setLocalItems] = useState<CommentItem[]>([]);
  useEffect(() => {
    if (open && !isLive) setLocalItems([]);
  }, [open, raw, isLive]);

  const items: CommentItem[] = isLive
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? ((query.data ?? []) as any[]).map((r) => ({
        id: r.id,
        author: r.author?.handle || r.author?.display_name || "rider",
        authorId: r.author_id,
        body: r.body,
        createdAt: new Date(r.created_at).getTime(),
        parentId: r.parent_id,
      }))
    : localItems;

  const [text, setText] = useState("");
  const [flagged, setFlagged] = useState<CommentItem | null>(null);
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setReplyTo(null);
  }, [open, raw]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const { roots, repliesByParent } = useMemo(() => {
    const roots: CommentItem[] = [];
    const map = new Map<string, CommentItem[]>();
    for (const c of items) {
      if (c.parentId) {
        const arr = map.get(c.parentId) ?? [];
        arr.push(c);
        map.set(c.parentId, arr);
      } else {
        roots.push(c);
      }
    }
    return { roots, repliesByParent: map };
  }, [items]);

  const addMut = useMutation({
    mutationFn: (v: { body: string; parent_id: string | null }) =>
      addFn({ data: { post_id: raw, body: v.body, parent_id: v.parent_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", raw] });
      onSubmitted?.();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't post comment"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", raw] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't delete"),
  });

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    const parentId = replyTo ? (replyTo.parentId ?? replyTo.id) : null;
    if (isLive) {
      if (!meId) { toast.error("Sign in to comment"); return; }
      addMut.mutate({ body, parent_id: parentId });
    } else {
      const next: CommentItem = {
        id: `c${Date.now()}`,
        author: "you",
        body,
        createdAt: Date.now(),
        parentId,
        likes: 0,
      };
      const merged = [...localItems, next];
      localStore.set(raw, merged);
      setLocalItems(merged);
      onSubmitted?.();
    }
    setText("");
    setReplyTo(null);
    void haptic("light");
  };

  const toggleLike = (c: CommentItem) => {
    if (isLive) { void haptic("light"); return; } // like on live comments not modeled yet
    const merged = localItems.map((it) =>
      it.id === c.id
        ? { ...it, likedByMe: !it.likedByMe, likes: (it.likes ?? 0) + (it.likedByMe ? -1 : 1) }
        : it,
    );
    localStore.set(raw, merged);
    setLocalItems(merged);
    void haptic("light");
  };

  const startReply = (c: CommentItem) => {
    setReplyTo(c);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const canDelete = (c: CommentItem) => isLive && !!c.authorId && c.authorId === meId;
  const removeMine = (c: CommentItem) => { if (canDelete(c)) delMut.mutate(c.id); };
  void removeMine; void canDelete;


  return (
    <div
      aria-hidden={!open}
      className="fixed inset-0 z-[80]"
      style={{ pointerEvents: open ? "auto" : "none" }}
    >
      <div
        onClick={onClose}
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          background: "rgba(15,15,15,0.32)",
          backdropFilter: "blur(6px)",
          opacity: open ? 1 : 0,
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          height: "82vh",
          background: "var(--color-paper-0)",
          color: "var(--color-ink-0)",
          borderTop: "1px solid var(--color-line)",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          transform: open ? "translateY(0)" : "translateY(100%)",
          boxShadow: "0 -30px 80px -20px rgba(15,15,15,0.18)",
        }}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <span
            className="block h-1 w-10 rounded-full"
            style={{ background: "var(--color-line-2)" }}
          />
        </div>

        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--color-ink-0)" }}>
            {title}{" "}
            <span className="mono-num text-[11px]" style={{ color: "var(--color-ink-3)" }}>
              {items.length}
            </span>
          </h3>
          <button
            onClick={onClose}
            aria-label="Close comments"
            className="tap grid h-8 w-8 place-items-center rounded-full"
            style={{ background: "var(--color-paper-2)", color: "var(--color-ink-0)" }}
          >
            ✕
          </button>
        </div>

        <div aria-hidden className="mx-5 h-px" style={{ background: "var(--color-line)" }} />

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {roots.length === 0 && (
            <p className="pt-10 text-center text-[13px]" style={{ color: "var(--color-ink-3)" }}>
              Be the first to comment.
            </p>
          )}
          {roots.map((c) => (
            <CommentRow
              key={c.id}
              c={c}
              onReply={startReply}
              onLike={toggleLike}
              onFlag={setFlagged}
              replies={repliesByParent.get(c.id) ?? []}
            />
          ))}
        </div>

        {replyTo && (
          <div
            className="flex items-center justify-between px-5 py-1.5 text-[11px]"
            style={{ background: "var(--color-paper-1)", color: "var(--color-ink-2)", borderTop: "1px solid var(--color-line)" }}
          >
            <span>Replying to <b style={{ color: "var(--color-ink-0)" }}>@{replyTo.author}</b></span>
            <button className="tap" onClick={() => setReplyTo(null)} aria-label="Cancel reply">✕</button>
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 pt-3"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
            borderTop: "1px solid var(--color-line)",
            background: "var(--color-paper-0)",
          }}
        >
          <button
            type="button"
            aria-label="Add emoji"
            className="tap grid h-11 w-11 shrink-0 place-items-center rounded-full text-[18px]"
            style={{ background: "var(--color-paper-2)", color: "var(--color-ink-1)" }}
          >
            😊
          </button>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={replyTo ? `Reply to @${replyTo.author}…` : "Add a comment…"}
            enterKeyHint="send"
            autoComplete="off"
            autoCapitalize="sentences"
            inputMode="text"
            className="min-w-0 rounded-full px-4 text-[15px] outline-none"
            style={{
              height: 44,
              background: "var(--color-paper-2)",
              color: "var(--color-ink-0)",
              border: "1px solid var(--color-line)",
              WebkitAppearance: "none",
            }}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Post comment"
            className="tap shrink-0 px-4 text-[13px] font-semibold"
            style={{
              height: 44,
              borderRadius: 999,
              background: text.trim() ? "var(--color-neon)" : "var(--color-paper-2)",
              color: text.trim() ? "var(--color-ink-0)" : "var(--color-ink-3)",
              transition: "all 160ms ease",
            }}
          >
            Post
          </button>
        </form>
      </div>
      <ReportBlockSheet
        open={!!flagged}
        onClose={() => setFlagged(null)}
        targetKind="comment"
        targetId={flagged?.id}
        authorHandle={flagged?.author}
      />
    </div>
  );
}

function CommentRow({
  c,
  replies,
  onReply,
  onLike,
  onFlag,
  nested = false,
}: {
  c: CommentItem;
  replies?: CommentItem[];
  onReply: (c: CommentItem) => void;
  onLike: (c: CommentItem) => void;
  onFlag: (c: CommentItem) => void;
  nested?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const replyCount = replies?.length ?? 0;
  return (
    <div className={nested ? "flex gap-3 pl-10" : "flex gap-3"}>
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
        style={{
          background: "var(--color-paper-2)",
          border: "1px solid var(--color-line)",
          color: "var(--color-ink-0)",
        }}
      >
        {c.author.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold" style={{ color: "var(--color-ink-0)" }}>{c.author}</span>
          <span className="mono-num text-[10px]" style={{ color: "var(--color-ink-3)" }}>
            {timeAgo(c.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-[13.5px] leading-snug" style={{ color: "var(--color-ink-1)" }}>
          {c.body}
        </p>
        <div className="mt-1 flex items-center gap-4 text-[11px]" style={{ color: "var(--color-ink-3)" }}>
          <button
            className="tap"
            onClick={() => onLike(c)}
            aria-pressed={c.likedByMe}
            style={{ color: c.likedByMe ? "var(--color-neon)" : "var(--color-ink-3)" }}
          >
            {c.likedByMe ? "♥" : "♡"} {c.likes ?? 0}
          </button>
          {!nested && <button className="tap" onClick={() => onReply(c)}>Reply</button>}
          <button
            className="tap ml-auto"
            aria-label="Report comment"
            onClick={() => onFlag(c)}
          >
            ⋯
          </button>
        </div>
        {replyCount > 0 && (
          <button
            className="tap mt-2 text-[11px] font-semibold"
            style={{ color: "var(--color-ink-2)" }}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide replies" : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
          </button>
        )}
        {expanded && replies && (
          <div className="mt-3 space-y-3">
            {replies.map((r) => (
              <CommentRow
                key={r.id}
                c={r}
                onReply={onReply}
                onLike={onLike}
                onFlag={onFlag}
                nested
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
