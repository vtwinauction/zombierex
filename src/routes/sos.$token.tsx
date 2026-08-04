/**
 * Public SOS tracker — anyone with the share_token can watch the rider's
 * live location. No auth required. Reads via the anon SELECT policy on
 * sos_alerts + sos_pings, filtered by token.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, MapPin, Clock, Gauge, Copy, ExternalLink } from "lucide-react";

const RouteMap = lazy(() => import("@/components/RouteMap"));

export const Route = createFileRoute("/sos/$token")({
  head: ({ params }) => ({
    meta: [
      { title: `SOS · ZOMBIEREX` },
      { name: "description", content: "Live rider emergency tracker." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Rider SOS — live tracker" },
      {
        property: "og:description",
        content: "Follow a rider's live location during an active emergency.",
      },
    ],
  }),
  component: SosTracker,
});

type Alert = {
  id: string;
  kind: string;
  status: string;
  message: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy_m: number | null;
  speed_kmh: number | null;
  heading: number | null;
  created_at: string;
  resolved_at: string | null;
  contacts_snapshot: any;
};
type Ping = {
  id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
  speed_kmh: number | null;
};

function SosTracker() {
  const { token } = Route.useParams();
  const [alert, setAlert] = useState<Alert | null | "missing">(null);
  const [pings, setPings] = useState<Ping[]>([]);

  useEffect(() => {
    let stop = false;
    async function poll() {
      const { data: a } = await supabase.rpc("get_sos_by_token", { _token: token }).maybeSingle();
      if (stop) return;
      if (!a) {
        setAlert("missing");
        return;
      }
      setAlert(a as Alert);
      const { data: p } = await supabase.rpc("get_sos_pings_by_token", {
        _token: token,
        _limit: 500,
      });
      if (!stop) setPings((p ?? []) as Ping[]);
    }
    poll();
    const i = setInterval(poll, 5000);
    return () => {
      stop = true;
      clearInterval(i);
    };
  }, [token]);

  const last = pings[pings.length - 1] ?? null;
  const center = useMemo(() => {
    if (last) return { lat: last.latitude, lng: last.longitude };
    if (alert && alert !== "missing" && alert.latitude != null && alert.longitude != null)
      return { lat: alert.latitude, lng: alert.longitude };
    return null;
  }, [last, alert]);

  const polyline = useMemo(
    () => pings.map((p) => ({ lat: p.latitude, lng: p.longitude })),
    [pings],
  );

  if (alert === null) return <FullMsg>Loading…</FullMsg>;
  if (alert === "missing") return <FullMsg>This tracker link is invalid or has expired.</FullMsg>;

  const isActive = alert.status === "active";
  const ageMin = Math.max(
    0,
    Math.round((Date.now() - new Date(alert.created_at).getTime()) / 60000),
  );

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const primary = Array.isArray(alert.contacts_snapshot)
    ? alert.contacts_snapshot.find((c: any) => c.is_primary)
    : null;

  return (
    <div className="min-h-svh flex flex-col" style={{ background: "var(--color-canvas)" }}>
      <header
        className="px-4 py-3 text-white"
        style={{ background: isActive ? "linear-gradient(160deg,#dc2626,#7f1d1d)" : "#111827" }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest opacity-80">
              {alert.kind} · {alert.status}
            </div>
            <div className="text-sm font-semibold">
              {isActive ? "Rider needs assistance — live location" : "Alert is closed"}
            </div>
          </div>
          <span className="text-[11px] opacity-80">{ageMin}m ago</span>
        </div>
        {alert.message && <div className="mt-2 text-xs opacity-95">{alert.message}</div>}
      </header>

      <div className="relative" style={{ height: "60svh" }}>
        {center ? (
          <Suspense fallback={<FullMsg>Loading map…</FullMsg>}>
            <RouteMap
              path={polyline.length > 1 ? polyline : []}
              userLocation={center}
              center={center}
            />
          </Suspense>
        ) : (
          <FullMsg>Waiting for the first GPS ping…</FullMsg>
        )}
      </div>

      <section className="p-4 space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-2">
          <Stat
            icon={<Gauge className="h-4 w-4" />}
            label="Speed"
            value={last?.speed_kmh != null ? `${Math.round(last.speed_kmh)} km/h` : "—"}
          />
          <Stat
            icon={<Clock className="h-4 w-4" />}
            label="Last ping"
            value={last ? relTime(last.recorded_at) : "—"}
          />
          <Stat
            icon={<MapPin className="h-4 w-4" />}
            label="Accuracy"
            value={alert.accuracy_m != null ? `±${Math.round(alert.accuracy_m)}m` : "—"}
          />
        </div>

        {center && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}`}
            target="_blank"
            rel="noreferrer"
            className="tap flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--color-line)" }}
          >
            <ExternalLink className="h-4 w-4" /> Navigate to rider
          </a>
        )}

        {primary?.phone && (
          <a
            href={`tel:${primary.phone}`}
            className="tap block rounded-lg py-2 text-center text-sm font-semibold text-white"
            style={{ background: "#dc2626" }}
          >
            Call {primary.name}
          </a>
        )}

        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl);
            } catch {}
          }}
          className="tap flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs w-full"
          style={{ borderColor: "var(--color-line)" }}
        >
          <Copy className="h-3.5 w-3.5" /> Copy tracker link
        </button>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2" style={{ borderColor: "var(--color-line)" }}>
      <div
        className="flex items-center gap-1 text-[10px] uppercase tracking-wider"
        style={{ color: "var(--color-ink-3)" }}
      >
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function FullMsg({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid place-items-center h-full p-6 text-sm text-center"
      style={{ color: "var(--color-ink-3)" }}
    >
      {children}
    </div>
  );
}

function relTime(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}
