import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPostPublic } from "@/lib/feed.functions";

const postQO = (id: string) =>
  queryOptions({
    queryKey: ["public-post", id],
    queryFn: () => getPostPublic({ data: { id } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/p/$id")({
  loader: async ({ context, params }) => {
    const row = await context.queryClient.ensureQueryData(postQO(params.id));
    if (!row) throw notFound();
    return { post: row };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Post unavailable · ZOMBIEREX" }, { name: "robots", content: "noindex" }] };
    }
    const p: any = loaderData.post;
    const title = p.caption
      ? `${p.caption.slice(0, 60)} · ZOMBIEREX`
      : `${p.author?.display_name ?? "Rider"} on ZOMBIEREX`;
    const desc = p.caption?.slice(0, 155) ?? "A post on ZOMBIEREX — the rider network.";
    const img = p.thumbnail_url ?? (p.kind === "photo" ? p.media_url : undefined);
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: img ? "summary_large_image" : "summary" },
    ];
    if (img && /^https?:\/\//.test(img)) {
      meta.push({ property: "og:image", content: img });
      meta.push({ name: "twitter:image", content: img });
    }
    return { meta };
  },
  component: PostDetail,
  notFoundComponent: PostMissing,
});

function PostMissing() {
  return (
    <div className="px-6 pt-24 pb-24 text-center">
      <p className="mono-tag" style={{ color: "var(--color-ash)" }}>SIGNAL LOST</p>
      <h1 className="mt-2 display-xl text-4xl uppercase">Post not found</h1>
      <p className="mt-3 text-sm" style={{ color: "var(--color-ash)" }}>
        It may have been removed or never existed.
      </p>
      <Link to="/" className="btn-solid mt-8 inline-block mono-tag">OPEN FEED</Link>
    </div>
  );
}

function PostDetail() {
  const { data } = useSuspenseQuery(postQO(Route.useParams().id));
  const p: any = data!;
  const src = p.media_url ?? p.thumbnail_url;
  const isVideo = p.kind === "video" || (typeof src === "string" && /\.(mp4|webm|mov)(\?|$)/i.test(src));
  return (
    <article className="mx-auto max-w-xl px-4 pt-6 pb-32">
      {p.author && (
        <Link
          to="/u/$handle"
          params={{ handle: p.author.handle ?? p.author.id }}
          className="flex items-center gap-3"
        >
          {p.author.avatar_url ? (
            <img src={p.author.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover hairline" />
          ) : (
            <div className="h-11 w-11 rounded-full hairline" style={{ background: "var(--color-mist)" }} />
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{p.author.display_name ?? p.author.handle}</p>
            <p className="mono-tag truncate" style={{ color: "var(--color-ash)" }}>
              @{p.author.handle}{p.author.location ? ` · ${p.author.location}` : ""}
            </p>
          </div>
        </Link>
      )}

      {src && (
        <div className="relative mt-5 overflow-hidden hairline" style={{ background: "#000" }}>
          {isVideo ? (
            <video src={src} controls playsInline className="w-full" />
          ) : (
            <img src={src} alt={p.caption ?? "Post"} className="w-full object-cover" />
          )}
        </div>
      )}

      {p.caption && (
        <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed">{p.caption}</p>
      )}

      <div className="mt-5 flex gap-5 mono-tag" style={{ color: "var(--color-ash)" }}>
        <span>{p.likes_count ?? 0} LIKES</span>
        <span>{p.comments_count ?? 0} COMMENTS</span>
        <span>{p.views_count ?? 0} VIEWS</span>
      </div>

      <div className="mt-10 border-t pt-6" style={{ borderColor: "var(--color-mist)" }}>
        <p className="mono-tag" style={{ color: "var(--color-ash)" }}>JOIN THE CONVERSATION</p>
        <Link to="/auth" className="btn-solid mt-3 inline-block mono-tag">SIGN IN TO REPLY</Link>
      </div>
    </article>
  );
}
