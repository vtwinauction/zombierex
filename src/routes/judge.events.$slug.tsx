import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { judgeGetEvent } from "@/lib/judge.functions";

const eventQ = (slug: string) =>
  queryOptions({
    queryKey: ["judge-event", slug],
    queryFn: () => judgeGetEvent({ data: { slug } }),
  });

export const Route = createFileRoute("/judge/events/$slug")({
  head: ({ loaderData }) => {
    const t = (loaderData as any)?.event?.title ?? "Show";
    const d =
      (loaderData as any)?.event?.description ?? "AI-judged motorcycle & car show on ZOMBIEREX.";
    return {
      meta: [
        { title: `${t} · AI Show Judge` },
        { name: "description", content: d.slice(0, 155) },
        { property: "og:title", content: `${t} · AI Show Judge` },
        { property: "og:description", content: d.slice(0, 155) },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...((loaderData as any)?.event?.cover_url
          ? [
              { property: "og:image", content: (loaderData as any).event.cover_url },
              { name: "twitter:image", content: (loaderData as any).event.cover_url },
            ]
          : []),
      ],
    };
  },
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(eventQ(params.slug));
    if (!data.event) throw notFound();
    return data;
  },
  component: EventDetail,
  notFoundComponent: () => (
    <div className="p-8 text-center text-[13px]" style={{ color: "var(--color-silver)" }}>
      Event not found.
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-[13px]" style={{ color: "var(--color-silver)" }}>
      Failed to load event: {String(error?.message ?? error)}
    </div>
  ),
});

function EventDetail() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(eventQ(slug));
  const event = data.event!;
  const entries = data.entries;

  return (
    <div className="pb-24">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ EVENT · {event.status.toUpperCase()}
        </p>
        <h1 className="serif mt-2 text-3xl leading-tight" style={{ color: "var(--color-ink)" }}>
          {event.title}
        </h1>
        {event.description && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--color-silver)" }}>
            {event.description}
          </p>
        )}
        <div className="mt-3 flex gap-2 flex-wrap">
          {(event.vehicle_types ?? []).map((v: string) => (
            <span
              key={v}
              className="chip"
              style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}
            >
              {v}
            </span>
          ))}
        </div>
        {["open", "judging"].includes(event.status) && (
          <Link
            to="/judge/submit/$eventSlug"
            params={{ eventSlug: event.slug }}
            className="mt-4 inline-block px-4 py-2 mono-tag"
            style={{
              background: "var(--color-obsidian)",
              color: "var(--color-neon)",
              borderRadius: 8,
            }}
          >
            ENTER YOUR BUILD →
          </Link>
        )}
      </header>

      <section className="mt-6 px-5">
        <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
          {event.status === "published" ? `STANDINGS · ${entries.length}` : "AWAITING RESULTS"}
        </p>
        {event.status !== "published" ? (
          <div className="p-6 surface-1 lift-1 text-center" style={{ borderRadius: 10 }}>
            <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
              Results appear once judging is complete and results are published.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {entries.map((e, i) => (
              <Link
                key={e.id}
                to="/judge/entries/$id"
                params={{ id: e.id }}
                className="tap flex items-center justify-between px-4 py-3 surface-1 lift-1"
                style={{ borderRadius: 10 }}
              >
                <div className="flex items-center gap-3">
                  <span className="mono-tag" style={{ color: "var(--color-neon)", width: 24 }}>
                    #{i + 1}
                  </span>
                  <div>
                    <p className="serif text-[15px]" style={{ color: "var(--color-ink)" }}>
                      {e.display_name}
                    </p>
                    <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 10 }}>
                      {[e.year, e.make, e.model].filter(Boolean).join(" ")}
                      {e.city ? ` · ${e.city}` : ""}
                    </p>
                    {e.awards?.length ? (
                      <p
                        className="mono-tag mt-0.5"
                        style={{ color: "var(--color-neon)", fontSize: 9 }}
                      >
                        {e.awards
                          .map((a: string) => a.replace(/_/g, " ").toUpperCase())
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span className="serif text-2xl italic" style={{ color: "var(--color-ink)" }}>
                  {e.overall_score ?? "—"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
