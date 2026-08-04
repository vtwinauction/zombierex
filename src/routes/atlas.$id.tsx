import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRoute, toggleSaveRoute, startRide } from "@/lib/routes.functions";
import { buildGpx, downloadGpx } from "@/lib/gpx";
import { BottomNav } from "@/components/BottomNav";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";

const RouteMap = lazy(() => import("@/components/RouteMap"));

const routeQuery = (id: string) =>
  queryOptions({
    queryKey: ["atlas", "route", id],
    queryFn: () => getRoute({ data: { id } }),
  });

export const Route = createFileRoute("/atlas/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(routeQuery(params.id)),
  head: ({ loaderData }) => {
    const r: any = loaderData;
    const title = r?.title ? `${r.title} — Route Atlas` : "Route — Zombierex";
    const desc = r?.description?.slice(0, 160) || "Motorcycle route with POIs.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(r?.cover_url ? [{ property: "og:image", content: r.cover_url } as any] : []),
      ],
    };
  },
  component: RouteDetail,
  errorComponent: RouteErrorPanel,
  notFoundComponent: () => <div className="p-6 text-foreground">Route not found</div>,
});

function RouteErrorPanel({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="p-6 text-foreground">
      <p>Failed to load route: {error.message}</p>
      <button
        onClick={() => {
          reset();
          router.invalidate();
        }}
        className="mt-3 border border-border px-3 py-1 text-xs"
      >
        Retry
      </button>
    </div>
  );
}

function RouteDetail() {
  const { data } = useSuspenseQuery(routeQuery(Route.useParams().id));
  const route: any = data;
  const hidden = useScrollDirection() === "down";
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const doSave = useServerFn(toggleSaveRoute);
  const doRide = useServerFn(startRide);
  const nav = useNavigate();

  if (!route) return <div className="p-6 text-white">Route not found</div>;

  const km = (route.distance_m / 1000).toFixed(1);
  const hrs = Math.floor(route.duration_s / 3600);
  const mins = Math.round((route.duration_s % 3600) / 60);

  async function onSave() {
    setSaving(true);
    try {
      const r = await doSave({ data: { id: route.id } });
      setSaved(r.saved);
    } catch (e: any) {
      if (String(e.message).includes("Unauthorized")) nav({ to: "/auth" });
    } finally {
      setSaving(false);
    }
  }
  async function onRide() {
    try {
      await doRide({ data: { id: route.id } });
    } catch (e: any) {
      if (String(e.message).includes("Unauthorized")) {
        nav({ to: "/auth" });
        return;
      }
    }
    // open Google Maps directions to start point
    if (route.start_lat && route.start_lng) {
      const { openExternal } = await import("@/lib/native");
      await openExternal(
        `https://www.google.com/maps/dir/?api=1&destination=${route.start_lat},${route.start_lng}&travelmode=driving`,
      );
    }
  }
  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const { share } = await import("@/lib/native");
    const res = await share({ title: route.title, url, dialogTitle: "Share route" });
    if (res.ok) toast.success("Shared");
  }
  function onExportGpx() {
    const waypoints = (route.pois ?? []).map((p: any) => ({
      lat: p.lat,
      lng: p.lng,
      name: p.name,
    }));
    const gpx = buildGpx(route.title, route.path ?? [], waypoints);
    downloadGpx(`route-${route.id.slice(0, 8)}.gpx`, gpx);
    toast.success("GPX downloaded");
  }

  return (
    <div className="min-h-svh pb-32">
      <Suspense fallback={<div className="h-72 w-full bg-graphite" />}>
        <RouteMap
          path={route.path ?? []}
          pois={route.pois ?? []}
          interactive
          className="h-72 w-full"
        />
      </Suspense>
      <div className="px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mono-tag" style={{ color: "var(--color-neon)", fontSize: 10 }}>
              {route.difficulty?.toUpperCase()} · {route.surface?.toUpperCase()}
            </p>
            <h1 className="serif text-2xl italic text-white">{route.title}</h1>
            <p className="mono-tag mt-1" style={{ color: "var(--color-titanium)", fontSize: 10 }}>
              {route.region ? `${route.region} · ` : ""}by {route.owner?.display_name || "rider"}
            </p>
          </div>
          <button
            onClick={onShare}
            className="tap mono-caps text-[10px] font-bold text-white/80"
            style={{ padding: "6px 10px", border: "1px solid var(--color-hair-strong)" }}
          >
            SHARE
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="DIST" value={`${km} KM`} />
          <Stat label="TIME" value={`${hrs > 0 ? hrs + "h " : ""}${mins}m`} />
          <Stat label="SAVES" value={String(route.saves_count)} />
        </div>

        {route.description && (
          <p className="mt-4 text-sm text-white/85 whitespace-pre-wrap">{route.description}</p>
        )}

        {route.pois?.length > 0 && (
          <div className="mt-5">
            <p className="mono-caps text-[10px]" style={{ color: "var(--color-titanium)" }}>
              POINTS OF INTEREST
            </p>
            <div className="mt-2 grid gap-2">
              {route.pois.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 border border-white/10 bg-graphite p-3"
                >
                  <span className="mono-caps text-[9px]" style={{ color: "var(--color-neon)" }}>
                    {p.kind}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                    {p.address && (
                      <p
                        className="mono-tag truncate"
                        style={{ color: "var(--color-titanium)", fontSize: 9 }}
                      >
                        {p.address}
                      </p>
                    )}
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}${p.google_place_id ? `&query_place_id=${p.google_place_id}` : ""}`}
                    target="_blank"
                    rel="noreferrer"
                    className="tap mono-caps text-[9px] font-bold text-white/70"
                    style={{ padding: "4px 8px", border: "1px solid var(--color-hair-strong)" }}
                  >
                    OPEN
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="tap py-3 mono-caps text-xs font-bold"
            style={{
              background: "var(--color-graphite)",
              color: saved ? "var(--color-neon)" : "white",
              border: "1px solid var(--color-hair-strong)",
            }}
          >
            {saved ? "★ SAVED" : "☆ SAVE"}
          </button>
          <button
            onClick={onExportGpx}
            className="tap py-3 mono-caps text-xs font-bold"
            style={{
              background: "var(--color-graphite)",
              color: "white",
              border: "1px solid var(--color-hair-strong)",
            }}
          >
            ↓ GPX
          </button>
          <button
            onClick={onRide}
            className="tap py-3 mono-caps text-xs font-bold"
            style={{ background: "var(--color-neon)", color: "var(--color-obsidian)" }}
          >
            ▶ RIDE
          </button>
        </div>
      </div>
      <BottomNav hidden={hidden} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-graphite p-2 text-center">
      <p className="mono-tag" style={{ color: "var(--color-titanium)", fontSize: 8 }}>
        {label}
      </p>
      <p className="mono-num text-sm font-bold text-white">{value}</p>
    </div>
  );
}
