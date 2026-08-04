import { Link } from "@tanstack/react-router";

type Route = {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  distance_m: number;
  duration_s: number;
  difficulty: string;
  surface: string;
  region?: string | null;
  saves_count: number;
  rides_count: number;
};

export function RouteCard({ route }: { route: Route }) {
  const km = (route.distance_m / 1000).toFixed(1);
  const hrs = Math.floor(route.duration_s / 3600);
  const mins = Math.round((route.duration_s % 3600) / 60);
  return (
    <Link
      to="/atlas/$id"
      params={{ id: route.id }}
      className="tap block overflow-hidden border border-white/10 bg-graphite"
      style={{ borderRadius: 6 }}
    >
      <div
        className="relative aspect-[16/9] w-full overflow-hidden"
        style={{ background: "#0f1114" }}
      >
        {route.cover_url ? (
          <img
            src={route.cover_url}
            alt=""
            className="h-full w-full object-cover opacity-90"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-white/30 mono-tag">
            NO COVER
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute inset-x-3 bottom-2 flex items-center justify-between">
          <span className="mono-tag" style={{ color: "var(--color-neon)", fontSize: 9 }}>
            {route.difficulty.toUpperCase()} · {route.surface.toUpperCase()}
          </span>
          <span className="mono-num text-[11px] font-bold text-white">{km} KM</span>
        </div>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-white">{route.title}</p>
        <p
          className="mono-tag mt-1 truncate"
          style={{ color: "var(--color-titanium)", fontSize: 9 }}
        >
          {route.region ? `${route.region} · ` : ""}
          {hrs > 0 ? `${hrs}h ` : ""}
          {mins}m · ★ {route.saves_count} · ▶ {route.rides_count}
        </p>
      </div>
    </Link>
  );
}
