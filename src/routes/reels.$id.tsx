import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPostPublic } from "@/lib/feed.functions";
import { RichCaption } from "@/components/RichCaption";
import { AutoplayVideo } from "@/components/AutoplayVideo";


const reelQO = (id: string) =>
  queryOptions({
    queryKey: ["public-reel", id],
    queryFn: () => getPostPublic({ data: { id } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/reels/$id")({
  loader: async ({ context, params }) => {
    const row = await context.queryClient.ensureQueryData(reelQO(params.id));
    if (!row) throw notFound();
    return { post: row };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Reel unavailable · ZOMBIEREX" }, { name: "robots", content: "noindex" }] };
    }
    const p: any = loaderData.post;
    const author = p.author?.display_name ?? p.author?.handle ?? "Rider";
    const title = `${author} · Reel · ZOMBIEREX`;
    const desc = (p.caption ?? `Watch ${author} on ZOMBIEREX.`).slice(0, 155);
    const img = p.thumbnail_url;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: img ? "summary_large_image" : "summary" },
    ];
    if (img && /^https?:\/\//.test(img)) {
      meta.push({ property: "og:image", content: img });
      meta.push({ name: "twitter:image", content: img });
    }
    return { meta };
  },
  component: ReelSolo,
  notFoundComponent: ReelMissing,
});

function ReelMissing() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center" style={{ background: "#000", color: "#fff" }}>
      <div>
        <p className="mono-tag" style={{ color: "#888" }}>REEL NOT FOUND</p>
        <Link to="/reels" className="btn-solid mt-6 inline-block mono-tag">OPEN REELS</Link>
      </div>
    </div>
  );
}

function ReelSolo() {
  const { data } = useSuspenseQuery(reelQO(Route.useParams().id));
  const p: any = data!;
  const src = p.media_url ?? p.thumbnail_url;
  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: "#000" }}>
      {src ? (
        <AutoplayVideo
          src={src}
          poster={p.thumbnail_url ?? undefined}
          forcePlay
          controls
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (

        <div className="grid h-screen w-full place-items-center text-white/60 mono-tag">NO MEDIA</div>
      )}
      <div
        className="absolute inset-x-0 bottom-0 p-5 pb-24"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)", color: "#fff" }}
      >
        {p.author && (
          <Link
            to="/u/$handle"
            params={{ handle: p.author.handle ?? p.author.id }}
            className="flex items-center gap-3"
          >
            {p.author.avatar_url && (
              <img src={p.author.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">@{p.author.handle}</p>
              {p.author.location && (
                <p className="mono-tag text-white/60">{p.author.location}</p>
              )}
            </div>
          </Link>
        )}
        {p.caption && (
          <RichCaption text={p.caption} className="mt-3 block text-[14px] leading-relaxed" />
        )}
        <div className="mt-3 flex gap-4 mono-tag text-white/70">
          <span>{p.likes_count ?? 0} LIKES</span>
          <span>{p.comments_count ?? 0} COMMENTS</span>
          <span>{p.views_count ?? 0} VIEWS</span>
        </div>
      </div>
    </div>
  );
}
