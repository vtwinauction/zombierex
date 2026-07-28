import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getHashtagFeed } from "@/lib/hashtags.functions";

const feedQuery = (tag: string) =>
  queryOptions({
    queryKey: ["hashtag", tag],
    queryFn: () => getHashtagFeed({ data: { tag } }),
  });

export const Route = createFileRoute("/tag/$tag")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(feedQuery(params.tag)),
  head: ({ params }) => {
    const title = `#${params.tag} · ZOMBIEREX`;
    const description = `Builds, rides and reels tagged #${params.tag} across the ZOMBIEREX network.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: HashtagPage,
});

function HashtagPage() {
  const { tag } = Route.useParams();
  const { data } = useSuspenseQuery(feedQuery(tag));

  return (
    <div className="pb-28">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ TAG STREAM</p>
        <h1 className="serif mt-2 text-4xl leading-tight" style={{ color: "var(--color-ink)" }}>
          #<span className="italic" style={{ color: "var(--color-neon)" }}>{data.tag}</span>
        </h1>
        <p className="mono-tag mt-2" style={{ color: "var(--color-silver)" }}>
          {data.posts.length} POSTS · {data.usage_count} USES
        </p>
      </header>

      {data.related.length > 0 && (
        <nav className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-5">
          {data.related.map((r: any) => (
            <Link
              key={r.tag}
              to="/tag/$tag"
              params={{ tag: r.tag }}
              className="chip shrink-0"
              style={{ color: "var(--color-silver)", borderColor: "var(--color-hair-strong)" }}
            >
              #{r.tag}
            </Link>
          ))}
        </nav>
      )}

      {data.posts.length === 0 ? (
        <div className="mx-5 mt-8 surface-1 p-6 text-center" style={{ borderRadius: 10 }}>
          <p className="serif text-xl italic" style={{ color: "var(--color-ink)" }}>Nothing tagged yet</p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-ink-3)" }}>
            Be the first to post with #{data.tag}.
          </p>
          <Link to="/post/new" className="btn-solid mt-4 inline-block">Create post</Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-3 gap-[2px] px-[2px]">
          {data.posts.map((p: any) => (
            <Link
              key={p.id}
              to="/post/$id"
              params={{ id: p.id }}
              className="relative block aspect-square overflow-hidden"
              style={{ background: "var(--color-paper-1, #14171a)" }}
            >
              {p.thumbnail_url || p.media_url ? (
                <img
                  src={p.thumbnail_url ?? p.media_url}
                  alt={p.caption ?? `Post tagged #${data.tag}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid h-full w-full place-items-center px-2 text-center text-xs" style={{ color: "var(--color-ink-3)" }}>
                  {p.caption?.slice(0, 60) ?? "—"}
                </span>
              )}
              <span
                className="mono-tag absolute bottom-1 left-1 rounded px-1"
                style={{ background: "rgba(0,0,0,.55)", color: "var(--color-neon)" }}
              >
                ♥ {p.likes_count ?? 0}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
