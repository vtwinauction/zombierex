import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { follow, unfollow, getProfileByHandlePublic } from "@/lib/feed.functions";
import { supabase } from "@/integrations/supabase/client";
import { RichCaption } from "@/components/RichCaption";
import { haptic } from "@/lib/native";

const profileQO = (handle: string) =>
  queryOptions({
    queryKey: ["public-profile", handle.toLowerCase()],
    queryFn: () => getProfileByHandlePublic({ data: { handle } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/u/$handle")({
  loader: async ({ context, params }) => {
    const row = await context.queryClient.ensureQueryData(profileQO(params.handle));
    if (!row) throw notFound();
    return row;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Rider not found · ZOMBIEREX" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.profile;
    const title = `${p.display_name ?? "@" + p.handle} · ZOMBIEREX`;
    const desc = (p.bio ?? `${p.display_name ?? p.handle} on ZOMBIEREX — the rider network.`).slice(0, 155);
    const img = p.avatar_url;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: img ? "summary_large_image" : "summary" },
    ];
    if (img && /^https?:\/\//.test(img)) {
      meta.push({ property: "og:image", content: img });
      meta.push({ name: "twitter:image", content: img });
    }
    return { meta };
  },
  component: PublicProfile,
  notFoundComponent: HandleMissing,
});

function HandleMissing() {
  return (
    <div className="px-6 pt-24 pb-24 text-center">
      <p className="mono-tag" style={{ color: "var(--color-ash)" }}>NO SUCH RIDER</p>
      <h1 className="mt-2 display-xl text-4xl uppercase">Handle not found</h1>
      <Link to="/search" className="btn-solid mt-8 inline-block mono-tag">SEARCH RIDERS</Link>
    </div>
  );
}

function PublicProfile() {
  const { data } = useSuspenseQuery(profileQO(Route.useParams().handle));
  const p: any = data!.profile;
  const posts: any[] = data!.posts;

  return (
    <div className="pb-24">
      <div
        className="relative h-40 w-full"
        style={{
          background: p.cover_url
            ? `center/cover url(${p.cover_url})`
            : "linear-gradient(135deg, var(--color-mist), var(--color-obsidian))",
        }}
      />
      <div className="px-4">
        <div className="-mt-10 flex items-end gap-4">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover hairline" style={{ borderWidth: 3, borderStyle: "solid", borderColor: "var(--color-bone)" }} />
          ) : (
            <div className="h-20 w-20 rounded-full hairline" style={{ background: "var(--color-mist)" }} />
          )}
          <div className="min-w-0 pb-1">
            <h1 className="truncate display-xl text-2xl uppercase">{p.display_name ?? p.handle}</h1>
            <p className="mono-tag truncate" style={{ color: "var(--color-ash)" }}>
              @{p.handle}{p.is_verified ? " · VERIFIED" : ""}{p.tier ? ` · ${String(p.tier).toUpperCase()}` : ""}
            </p>
          </div>
        </div>

        {p.bio && <RichCaption text={p.bio} className="mt-4 block text-[14px] leading-relaxed" />}

        <div className="mt-4 flex gap-6 mono-tag">
          <span><b className="text-base font-semibold">{p.posts_count ?? 0}</b> POSTS</span>
          <span><b className="text-base font-semibold">{p.followers_count ?? 0}</b> FOLLOWERS</span>
          <span><b className="text-base font-semibold">{p.following_count ?? 0}</b> FOLLOWING</span>
        </div>

        {(p.location || p.website) && (
          <p className="mt-3 mono-tag" style={{ color: "var(--color-ash)" }}>
            {p.location ?? ""}{p.location && p.website ? " · " : ""}{p.website ?? ""}
          </p>
        )}

        <FollowActions profileId={p.id} handle={p.handle} />


        <div className="mt-8">
          <p className="mono-tag" style={{ color: "var(--color-ash)" }}>POSTS · {posts.length}</p>
          {posts.length === 0 ? (
            <p className="mt-6 text-center text-sm" style={{ color: "var(--color-ash)" }}>No posts yet.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-3 gap-1">
              {posts.map((post) => {
                const src = post.thumbnail_url ?? post.media_url ?? "";
                const isVid = post.kind === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(src);
                return (
                  <li key={post.id} className="aspect-square overflow-hidden hairline">
                    <Link to="/p/$id" params={{ id: post.id }} className="block h-full w-full">
                      {src ? (
                        isVid ? (
                          <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                        ) : (
                          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                        )
                      ) : (
                        <div className="grid h-full w-full place-items-center" style={{ background: "var(--color-mist)" }}>
                          <p className="mono-tag px-2 text-center line-clamp-3" style={{ color: "var(--color-ash)" }}>
                            {(post.caption ?? "POST").slice(0, 60)}
                          </p>
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
