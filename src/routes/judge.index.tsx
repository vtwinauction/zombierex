import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { judgeIsEnabled, judgeListEvents } from "@/lib/judge.functions";
import { useModule } from "@/hooks/usePlatform";
import { ModuleNotice } from "@/components/MaintenanceGate";

const enabledQ = queryOptions({ queryKey: ["judge-enabled"], queryFn: () => judgeIsEnabled() });
const eventsQ = queryOptions({ queryKey: ["judge-events", "all"], queryFn: () => judgeListEvents({ data: { status: "all" } }) });

export const Route = createFileRoute("/judge/")({
  head: () => ({
    meta: [
      { title: "AI Show Judge · ZOMBIEREX" },
      { name: "description", content: "AI-powered concours judging for motorcycles and cars — enter shows, get scored, win awards." },
      { property: "og:title", content: "AI Show Judge · ZOMBIEREX" },
      { property: "og:description", content: "AI-powered concours judging for motorcycles and cars." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    const [enabled] = await Promise.all([
      context.queryClient.ensureQueryData(enabledQ),
      context.queryClient.ensureQueryData(eventsQ),
    ]);
    return enabled;
  },
  component: JudgeHub,
});

function JudgeHub() {
  const zxModule = useModule("judge");
  if (!zxModule.loading && !zxModule.enabled) return <ModuleNotice status={zxModule} label="AI Judge" />;

  const { data: flag } = useSuspenseQuery(enabledQ);
  const { data: events } = useSuspenseQuery(eventsQ);

  return (
    <div className="pb-24">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ AI SHOW JUDGE</p>
        <h1 className="serif mt-2 text-4xl leading-tight" style={{ color: "var(--color-ink)" }}>
          Concours <span className="italic" style={{ color: "var(--color-neon)" }}>by algorithm</span>
        </h1>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-silver)" }}>
          Upload your build. AI judges paint, engine bay, fabrication, sound. Win real awards.
        </p>

        <div className="mt-4 flex gap-2">
          <Link to="/judge/leaderboards" className="chip" style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}>Leaderboards</Link>
          <Link to="/judge/mine" className="chip" style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}>My entries</Link>
        </div>
      </header>

      {!flag.enabled && (
        <div className="mx-5 mt-6 p-4 surface-1 lift-1" style={{ borderRadius: 10 }}>
          <p className="mono-tag" style={{ color: "var(--color-silver)" }}>MODULE OFFLINE</p>
          <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink)" }}>
            AI Show Judge is currently disabled by administrators. New entries are paused; existing published events remain viewable.
          </p>
        </div>
      )}

      <section className="mt-6 px-5">
        <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>ACTIVE & PAST EVENTS</p>
        {events.length === 0 ? (
          <div className="p-6 surface-1 lift-1 text-center" style={{ borderRadius: 10 }}>
            <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>No public events yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <Link
                key={e.id}
                to="/judge/events/$slug"
                params={{ slug: e.slug }}
                className="tap block p-4 surface-1 lift-1"
                style={{ borderRadius: 10 }}
              >
                <div className="flex items-center justify-between">
                  <p className="serif text-lg" style={{ color: "var(--color-ink)" }}>{e.title}</p>
                  <span className="mono-tag" style={{ color: e.status === "published" ? "var(--color-neon)" : "var(--color-silver)" }}>
                    {e.status.toUpperCase()}
                  </span>
                </div>
                {e.description && (
                  <p className="mt-1 text-[12px] line-clamp-2" style={{ color: "var(--color-silver)" }}>{e.description}</p>
                )}
                <div className="mt-2 flex gap-3 mono-tag" style={{ color: "var(--color-silver)", fontSize: 10 }}>
                  <span>{(e.vehicle_types ?? []).join(" · ").toUpperCase()}</span>
                  {e.registration_closes_at && <span>REG · {new Date(e.registration_closes_at).toLocaleDateString()}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
