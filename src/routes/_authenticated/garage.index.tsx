import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMyVehicles,
  setPrimaryVehicle,
  deleteVehicle,
  getFleetHealth,
} from "@/lib/garage.functions";
import { PullToRefresh } from "@/components/PullToRefresh";
import { confirmDialog } from "@/lib/confirm";

export const Route = createFileRoute("/_authenticated/garage/")({
  head: () => ({
    meta: [
      { title: "My Garage · ZOMBIEREX" },
      {
        name: "description",
        content: "Your digital garage — every build, modification and service record in one place.",
      },
      { property: "og:title", content: "My Garage · ZOMBIEREX" },
      {
        property: "og:description",
        content: "Track your builds, mods and maintenance history in the ZOMBIEREX digital garage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GaragePage,
});

function GaragePage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listMyVehicles);
  const setPrimary = useServerFn(setPrimaryVehicle);
  const del = useServerFn(deleteVehicle);

  const q = useQuery({ queryKey: ["garage", "mine"], queryFn: () => fetchList(), retry: false });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["garage"] });

  const primaryM = useMutation({
    mutationFn: (id: string) => setPrimary({ data: { id } }),
    onSuccess: invalidate,
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: invalidate,
  });

  return (
    <PullToRefresh onRefresh={() => q.refetch()}>
      <div className="pb-24" style={{ background: "var(--color-paper-1)" }}>
        <header className="flex items-end justify-between px-4 pt-5">
          <div>
            <p className="mono-tag text-[10px]" style={{ color: "var(--color-ink-3)" }}>
              DIGITAL GARAGE
            </p>
            <h1 className="serif mt-1 text-3xl" style={{ color: "var(--color-ink-0)" }}>
              My Garage
            </h1>
          </div>
          <Link
            to="/garage/new"
            className="tap rounded-md px-3 py-2 text-[12px] font-semibold"
            style={{ background: "var(--color-ink-0)", color: "var(--color-paper-0)" }}
          >
            Add vehicle
          </Link>
        </header>

        <FleetHealth />

        <div className="mt-5 space-y-3 px-4">
          {q.isLoading && (
            <p className="mono-tag" style={{ color: "var(--color-ink-3)" }}>
              Loading…
            </p>
          )}
          {q.data?.length === 0 && (
            <div
              className="rounded-xl p-6 text-center"
              style={{ border: "1px dashed var(--color-line)" }}
            >
              <p className="text-[13px]" style={{ color: "var(--color-ink-3)" }}>
                No vehicles yet. Add your first build to start logging mods and service history.
              </p>
              <Link
                to="/garage/new"
                className="mono-tag mt-3 inline-block"
                style={{ color: "var(--color-neon)" }}
              >
                ADD VEHICLE →
              </Link>
            </div>
          )}

          {q.data?.map((v) => (
            <article
              key={v.id}
              className="overflow-hidden rounded-xl"
              style={{ background: "var(--color-paper-0)", border: "1px solid var(--color-line)" }}
            >
              <Link to="/garage/$id" params={{ id: v.id }} className="block">
                <div
                  className="aspect-[16/9] w-full overflow-hidden"
                  style={{ background: "var(--color-paper-2)" }}
                >
                  {v.hero_image_url && (
                    <img
                      src={v.hero_image_url}
                      alt={`${v.make} ${v.model}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="p-3">
                  <p className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>
                    {String(v.kind).toUpperCase()}
                    {v.year ? ` · ${v.year}` : ""}
                    {v.is_primary ? " · PRIMARY" : ""}
                  </p>
                  <h2 className="mt-1 text-[15px] font-semibold" style={{ color: "var(--color-ink-0)" }}>
                    {v.nickname || `${v.make} ${v.model}`}
                  </h2>
                  {v.nickname && (
                    <p className="text-[12px]" style={{ color: "var(--color-ink-3)" }}>
                      {v.make} {v.model}
                    </p>
                  )}
                </div>
              </Link>
              <div className="flex gap-2 px-3 pb-3">
                {!v.is_primary && (
                  <button
                    onClick={() => primaryM.mutate(v.id)}
                    className="tap rounded-md px-3 py-1 text-[11px] font-semibold"
                    style={{ border: "1px solid var(--color-line)", color: "var(--color-ink-1)" }}
                  >
                    Make primary
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (
                      await confirmDialog({
                        title: "Remove this vehicle?",
                        description: "Its mods and service records go with it.",
                        destructive: true,
                        confirmLabel: "Remove",
                      })
                    )
                      deleteM.mutate(v.id);
                  }}
                  className="tap rounded-md px-3 py-1 text-[11px] font-semibold"
                  style={{ border: "1px solid rgba(255,80,80,0.5)", color: "#ff6b6b" }}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PullToRefresh>
  );
}

/** Fleet-wide maintenance summary across the rider's whole garage. */
function FleetHealth() {
  const fetchFleet = useServerFn(getFleetHealth);
  const { data } = useQuery({
    queryKey: ["garage", "fleet-health"],
    queryFn: () => fetchFleet(),
    retry: false,
    staleTime: 60_000,
  });
  if (!data || !data.vehicles.length) return null;

  const tone =
    data.overdueCount > 0
      ? "var(--color-danger, #d64545)"
      : data.dueSoonCount > 0
        ? "var(--color-warn, #c98a1d)"
        : "var(--color-neon)";

  return (
    <section className="mt-5 px-4">
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--color-paper-0)", border: "1px solid var(--color-line)" }}
      >
        <div className="flex items-baseline justify-between">
          <p className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>
            FLEET HEALTH · {data.vehicles.length} VEHICLE{data.vehicles.length === 1 ? "" : "S"}
          </p>
          <p className="text-2xl font-semibold" style={{ color: tone }}>
            {data.averageScore}
            <span className="text-[12px]" style={{ color: "var(--color-ink-3)" }}>
              /100
            </span>
          </p>
        </div>
        <p className="mono-tag mt-1" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>
          {data.overdueCount} OVERDUE · {data.dueSoonCount} DUE SOON
        </p>
        <ul className="mt-3 space-y-2">
          {data.vehicles.map((v) => (
            <li key={v.id}>
              <Link
                to="/garage/$id"
                params={{ id: v.id }}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p
                    className="truncate text-[13px] font-medium"
                    style={{ color: "var(--color-ink-0)" }}
                  >
                    {v.label}
                  </p>
                  <p className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>
                    {v.nextItem
                      ? `${v.nextItem.severity.toUpperCase().replace("-", " ")} · ${v.nextItem.title}`
                      : "NOTHING OUTSTANDING"}
                  </p>
                </div>
                <span className="text-[13px] font-semibold" style={{ color: "var(--color-ink-0)" }}>
                  {v.score}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
