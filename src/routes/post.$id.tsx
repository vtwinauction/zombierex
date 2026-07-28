import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getPostPublic } from "@/lib/feed.functions";
import { InteractionBar } from "@/components/InteractionBar";
import { CommentsSheet } from "@/components/CommentsSheet";
import { AutoplayVideo, isVideoUrl } from "@/components/AutoplayVideo";
import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/post/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Post · ZOMBIEREX` },
      { name: "description", content: `View post ${params.id} on ZOMBIEREX.` },
      { property: "og:title", content: `Post · ZOMBIEREX` },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PostDetailPage,
});

type PostRow = {
  id: string;
  author_id: string;
  kind: string;
  caption: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  views_count: number | null;
  created_at: string;
  author: {
    id: string;
    display_name: string | null;
    handle: string | null;
    avatar_url: string | null;
    is_verified: boolean | null;
    location: string | null;
    bio: string | null;
  } | null;
};

function PostDetailPage() {
  const { id } = Route.useParams();
  const fetchPost = useServerFn(getPostPublic);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const q = useQuery({
    queryKey: ["post", id],
    queryFn: () => fetchPost({ data: { id } }) as Promise<PostRow | null>,
    staleTime: 30_000,
  });

  const post = q.data;

  return (
    <PullToRefresh onRefresh={async () => { await q.refetch(); }}>
      <div>
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 hairline-b" style={{ background: "var(--color-bone, #fff)" }}>
          <Link to="/" className="inline-flex items-center justify-center h-9 w-9 -ml-2" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
          <p className="mono-tag">POST</p>
        </div>

        {q.isLoading && (
          <div className="px-4 py-16 text-center mono-tag" style={{ color: "var(--color-ash)" }}>LOADING…</div>
        )}

        {!q.isLoading && !post && (
          <div className="px-4 py-16 text-center">
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>POST NOT FOUND</p>
            <Link to="/" className="mt-4 inline-block underline text-sm">Return to feed</Link>
          </div>
        )}

        {post && (
          <article className="px-4 pt-4 pb-24">
            <header className="flex items-center gap-3 mb-3">
              {post.author?.handle ? (
                <Link to="/u/$handle" params={{ handle: post.author.handle }} className="flex items-center gap-3 min-w-0">
                  <img
                    src={post.author?.avatar_url || "/favicon.ico"}
                    alt={post.author?.display_name ?? "author"}
                    className="h-11 w-11 rounded-full object-cover hairline"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <p className="font-bold truncate">{post.author?.display_name ?? "Rider"}</p>
                    <p className="mono-tag truncate" style={{ color: "var(--color-ash)" }}>
                      @{post.author.handle}{post.author?.location ? ` · ${post.author.location}` : ""}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-[var(--color-mist)]" />
                  <p className="font-bold">Rider</p>
                </div>
              )}
            </header>

            {post.media_url && (
              <div className="relative w-full overflow-hidden hairline" style={{ background: "var(--color-ink)" }}>
                {isVideoUrl(post.media_url) ? (
                  <AutoplayVideo
                    src={post.media_url}
                    poster={post.thumbnail_url ?? undefined}
                    className="w-full max-h-[80vh] object-contain"
                  />
                ) : (
                  <img
                    src={post.media_url}
                    alt={post.caption ?? "Post media"}
                    className="w-full max-h-[80vh] object-contain"
                    loading="lazy"
                  />
                )}
              </div>
            )}

            {post.caption && (
              <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{post.caption}</p>
            )}

            <p className="mt-3 mono-tag" style={{ color: "var(--color-ash)" }}>
              {new Date(post.created_at).toLocaleString()}
            </p>

            <div className="mt-4">
              <InteractionBar
                targetId={`db:${post.id}`}
                counts={{
                  likes: post.likes_count ?? 0,
                  comments: post.comments_count ?? 0,
                  shares: post.shares_count ?? 0,
                }}
                onComment={() => setCommentsOpen(true)}
              />
            </div>
          </article>
        )}

        {post && (
          <CommentsSheet
            open={commentsOpen}
            onClose={() => setCommentsOpen(false)}
            targetId={`db:${post.id}`}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
