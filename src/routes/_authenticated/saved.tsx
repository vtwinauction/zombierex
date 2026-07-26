import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMySavedPosts } from "@/lib/feed.functions";
import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({
    meta: [
      { title: "Saved · ZOMBIEREX" },
      { name: "description", content: "Posts you've bookmarked from the ZOMBIEREX feed." },
      { property: "og:title", content: "Saved · ZOMBIEREX" },
      { property: "og:description", content: "Your bookmarked signal." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const fn = useServerFn(listMySavedPosts);
  const q = useQuery({
    queryKey: ["saved-posts"],
    queryFn: () => fn({}) as Promise<any[]>,
    staleTime: 30_000,
  });
  const rows = q.data ?? [];

  return (
    <PullToRefresh onRefresh={() => q.refetch()}>
      <div className="px-4 pt-6 pb-24">
        <p className="mono-tag">VAULT · {rows.length} ITEMS</p>
        <h1 className="mt-2 display-xl text-5xl uppercase">Saved</h1>

        {q.isLoading && <p className="mono-tag mt-10 text-center" style={{ color: "var(--color-ash)" }}>LOADING…</p>}

        {!q.isLoading && rows.length === 0 && (
          <div className="mt-16 text-center">
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>NO SAVES YET</p>
            <p className="mt-2 text-[13px]" style={{ color: "var(--color-ash)" }}>
              Tap the bookmark on any post to stash it here.
            </p>
            <Link to="/" className="btn-solid mt-6 inline-block mono-tag">OPEN FEED</Link>
          </div>
        )}

        {rows.length > 0 && (
          <ul className="mt-6 grid grid-cols-3 gap-1">
            {rows.map((p: any) => {
              const src = p.thumbnail_url ?? p.media_url ?? "";
              return (
                <li key={p.id} className="relative aspect-square overflow-hidden hairline">
                  <Link to="/p/$id" params={{ id: p.id }} className="block h-full w-full">
                  {src ? (
                    src.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                      <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    ) : (
                      <img src={src} alt={p.caption ?? "Saved post"} className="h-full w-full object-cover" loading="lazy" />
                    )
                  ) : (
                    <div className="grid h-full w-full place-items-center" style={{ background: "var(--color-mist)" }}>
                      <p className="mono-tag px-2 text-center line-clamp-3" style={{ color: "var(--color-ash)" }}>
                        {(p.caption ?? "POST").slice(0, 60)}
                      </p>
                    </div>
                  )}
                  {p.kind === "video" && (
                    <span
                      className="absolute right-1 top-1 mono-tag px-1.5 py-0.5"
                      style={{ background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 9 }}
                    >
                      REEL
                    </span>
                  )}
                  {p.author?.display_name && (
                    <span
                      className="absolute inset-x-0 bottom-0 truncate px-1.5 py-1 text-[10px] font-semibold"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)", color: "#fff" }}
                    >
                      {p.author.display_name}
                    </span>
                  )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PullToRefresh>
  );
}
