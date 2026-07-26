import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays, Clock, MapPin, Navigation, Share2, QrCode, Pencil,
  Users, Star, Camera, MessageCircle, Check, X, BadgeCheck, Eye, Send,
  Info, Radio, ImageIcon, MessagesSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  getEvent,
  rsvpEvent,
  checkInEvent,
  listAttendees,
  listEventComments,
  commentOnEvent,
  listEventPhotos,
  addEventPhoto,
  listAnnouncements,
  announceEvent,
  cancelEvent,
} from "@/lib/events.functions";

export const Route = createFileRoute("/_authenticated/events/$id")({
  head: () => ({
    meta: [
      { title: "Event · ZOMBIEREX" },
      { name: "description", content: "View event details, RSVP, check in, navigate, and connect with the ZOMBIEREX riding community." },
      { property: "og:title", content: "Event · ZOMBIEREX" },
      { property: "og:description", content: "View event details, RSVP, check in, navigate, and connect with the ZOMBIEREX riding community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventDetail,
});

const TABS = ["ABOUT", "LIVE", "PHOTOS", "ATTENDEES", "DISCUSSION"] as const;
const TAB_ICONS: Record<(typeof TABS)[number], typeof Info> = {
  ABOUT: Info,
  LIVE: Radio,
  PHOTOS: ImageIcon,
  ATTENDEES: Users,
  DISCUSSION: MessagesSquare,
};

function EventDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const get = useServerFn(getEvent);
  const rsvpFn = useServerFn(rsvpEvent);
  const checkInFn = useServerFn(checkInEvent);
  const cancelFn = useServerFn(cancelEvent);
  const { user } = useSession();

  const { data: ev, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => get({ data: { id } }),
  });

  const [tab, setTab] = useState<(typeof TABS)[number]>("ABOUT");

  // Realtime invalidation for live surfaces
  useEffect(() => {
    const ch = supabase
      .channel(`event:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_photos", filter: `event_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["event-photos", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "event_comments", filter: `event_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["event-comments", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "event_announcements", filter: `event_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["event-announcements", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "event_rsvps", filter: `event_id=eq.${id}` },
        () => { qc.invalidateQueries({ queryKey: ["event", id] }); qc.invalidateQueries({ queryKey: ["event-attendees", id] }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  if (isLoading) return <EventSkeleton />;
  if (!ev) return (
    <div className="p-6">
      <p className="mono-tag" style={{ color: "var(--color-ash)" }}>NOT FOUND</p>
      <Link to="/events" className="btn-solid mt-4 inline-block" style={{ padding: "8px 12px", fontSize: 10 }}>← EVENTS</Link>
    </div>
  );

  const e: any = ev;
  const isHost = !!user && user.id === e.host_id;
  const d = new Date(e.starts_at);


  const [checkingIn, setCheckingIn] = useState(false);

  async function doRsvp(status: "going" | "interested" | "not_going") {
    try {
      await rsvpFn({ data: { event_id: id, status } });
      qc.invalidateQueries({ queryKey: ["event", id] });
      toast.success(status === "not_going" ? "Marked as can't go" : status === "interested" ? "Marked as interested" : "You're going 🏁");
    } catch (err: any) {
      toast.error(err?.message || "Could not update RSVP");
    }
  }

  async function submitCheckIn(lat?: number, lng?: number) {
    try {
      await checkInFn({ data: { event_id: id, lat, lng } });
      qc.invalidateQueries({ queryKey: ["event", id] });
      qc.invalidateQueries({ queryKey: ["event-attendees", id] });
      const { haptic } = await import("@/lib/native");
      void haptic("success");
      toast.success("Checked in ✓");
    } catch (err: any) {
      const { haptic } = await import("@/lib/native");
      void haptic("error");
      toast.error(err?.message || "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  }

  async function doCheckIn() {
    if (checkingIn) return;
    setCheckingIn(true);
    if (!navigator.geolocation) return submitCheckIn();
    navigator.geolocation.getCurrentPosition(
      (pos) => submitCheckIn(pos.coords.latitude, pos.coords.longitude),
      () => submitCheckIn(),
      { timeout: 4000 }
    );
  }

  async function doShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      const { share: nativeShare } = await import("@/lib/native");
      const res = await nativeShare({ title: e.title, url, dialogTitle: "Share event" });
      if (res.ok) return;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      toast.error("Could not share");
    }
  }

  async function doNavigate() {
    if (!navHref) {
      toast.error("No location set for this event");
      return;
    }
    const { openExternal } = await import("@/lib/native");
    await openExternal(navHref);
  }

  const navHref = e.gps_lat && e.gps_lng
    ? `https://maps.google.com/?q=${e.gps_lat},${e.gps_lng}`
    : e.address
    ? `https://maps.google.com/?q=${encodeURIComponent(e.address)}`
    : e.location
    ? `https://maps.google.com/?q=${encodeURIComponent(e.location)}`
    : null;

  return (
    <div className="event-fade">

      {/* HERO — cover image, minimal overlays */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {e.cover_url ? (
          <img src={e.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="relative h-full w-full overflow-hidden"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 0%, #1a1a1a 0%, #0a0a0a 60%, #000 100%)",
            }}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,200,83,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,83,.18) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-6xl" style={{ color: "var(--color-signal)" }}>◈</div>
                <p className="mono-tag mt-3" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {(e.category ?? "EVENT").toUpperCase()}
                </p>
                {isHost && (
                  <Link
                    to="/events/$id/edit"
                    params={{ id }}
                    className="mono-tag mt-4 inline-block"
                    style={{ background: "var(--color-signal)", color: "var(--color-bone)", padding: "6px 12px" }}
                  >
                    + ADD COVER PHOTO
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Top action bar — back only; edit lives in primary actions */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3">
          <button onClick={() => navigate({ to: "/events" })} aria-label="Back to events" className="tap mono-tag text-white" style={{ background: "rgba(0,0,0,0.55)", padding: "8px 10px", backdropFilter: "blur(8px)" }}>
            ← BACK
          </button>
        </div>
      </div>


      {/* INFO SECTION — clean metadata block with icons */}
      <section className="event-section px-5 pt-5 pb-5 hairline-b" style={{ animationDelay: "40ms" }}>
        <h1 className="display-xl text-[26px] uppercase leading-[1.05] tracking-tight">{e.title}</h1>
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <CalendarDays size={16} className="mt-0.5 shrink-0" style={{ color: "var(--color-signal)" }} />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">
                {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className="mono-tag mt-1 flex items-center gap-1.5" style={{ color: "var(--color-ash)" }}>
                <Clock size={11} />
                {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {e.ends_at && ` → ${new Date(e.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              </p>
            </div>
          </div>
          {e.location && (
            <div className="flex items-start gap-3">
              <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: "var(--color-signal)" }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-snug">{e.location}</p>
                  <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                    <span
                      className="mono-tag"
                      style={{
                        color: "var(--color-signal)",
                        background: "color-mix(in oklab, var(--color-signal) 10%, transparent)",
                        padding: "3px 9px",
                        borderRadius: 999,
                      }}
                    >
                      {(e.category ?? "EVENT").toUpperCase()}
                    </span>
                    {e.status === "cancelled" ? (
                      <span
                        className="mono-tag"
                        style={{
                          color: "var(--color-bone)",
                          background: "#c33",
                          padding: "3px 9px",
                          borderRadius: 999,
                        }}
                      >
                        CANCELLED
                      </span>
                    ) : (
                      <span
                        className="mono-tag hairline"
                        style={{
                          color: "var(--color-ink)",
                          padding: "3px 9px",
                          borderRadius: 999,
                        }}
                      >
                        {(e.visibility ?? "public").toUpperCase()}
                      </span>
                    )}
                    {e.is_featured && (
                      <span
                        className="mono-tag"
                        style={{
                          color: "var(--color-bone)",
                          background: "var(--color-signal)",
                          padding: "3px 9px",
                          borderRadius: 999,
                        }}
                      >
                        ★ FEATURED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>


      {/* DASHBOARD — actions + analytics in one clean surface */}
      <section className="event-section px-5 pt-5 pb-4 hairline-b" style={{ animationDelay: "80ms" }}>
        {/* Primary actions — professional tile grid */}
        <div className={`grid gap-2 ${isHost ? "grid-cols-4" : "grid-cols-3"}`}>
          <ActionTile onClick={doCheckIn} icon={<QrCode size={18} />} label="CHECK IN" variant="primary" busy={checkingIn} checked={e.checked_in} />
          <ActionTile onClick={doNavigate} icon={<Navigation size={18} />} label="NAVIGATE" disabled={!navHref} />
          <ActionTile onClick={doShare} icon={<Share2 size={18} />} label="SHARE" />
          {isHost && (
            <ActionTile onClick={() => navigate({ to: "/events/$id/edit", params: { id } })} icon={<Pencil size={18} />} label="EDIT" />
          )}
        </div>


        {/* Analytics — borderless row with dividers */}
        <div className="mt-5 grid grid-cols-4 divide-x divide-hair">
          <MetricCell icon={<Users size={13} />} k="GOING" v={String(e.rsvp_count ?? 0)} active={e.my_rsvp === "going"} onClick={() => setTab("ATTENDEES")} />
          <MetricCell icon={<Star size={13} />} k="INTERESTED" v={String(e.interested_count ?? 0)} active={e.my_rsvp === "interested"} onClick={() => setTab("ATTENDEES")} />
          <MetricCell icon={<Camera size={13} />} k="PHOTOS" v={String(e.photos_count ?? 0)} onClick={() => setTab("PHOTOS")} />
          <MetricCell icon={<MessageCircle size={13} />} k="COMMENTS" v={String(e.comments_count ?? 0)} onClick={() => setTab("DISCUSSION")} />
        </div>

        {/* RSVP — segmented control */}
        <div className="mt-5 flex overflow-hidden hairline" style={{ borderRadius: 999 }}>
          {(["going", "interested", "not_going"] as const).map((s, i) => {
            const active = e.my_rsvp === s;
            const label = s === "going" ? "GOING" : s === "interested" ? "INTERESTED" : "CAN'T GO";
            const Icon = s === "going" ? Check : s === "interested" ? Star : X;
            return (
              <button
                key={s}
                onClick={() => doRsvp(s)}
                className="tap flex flex-1 items-center justify-center gap-1.5 py-2.5 mono-caps text-[10px] transition-colors"
                style={{
                  background: active ? "var(--color-signal)" : "transparent",
                  color: active ? "var(--color-bone)" : "var(--color-ink)",
                  borderLeft: i === 0 ? "none" : "1px solid var(--color-hair)",
                }}
              >
                <Icon size={12} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* HOST CARD — premium, icon-driven */}
      {e.host && (
        <section className="event-section px-5 py-5 hairline-b" style={{ animationDelay: "160ms" }}>
          <p className="mono-tag" style={{ color: "var(--color-ash)" }}>HOSTED BY</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="relative shrink-0">
              {e.host.avatar_url ? (
                <img src={e.host.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" style={{ boxShadow: "0 0 0 2px var(--color-signal)" }} />
              ) : (
                <div className="h-14 w-14 rounded-full grid place-items-center" style={{ background: "var(--color-mist)", boxShadow: "0 0 0 2px var(--color-signal)" }}>
                  <span className="mono-tag" style={{ color: "var(--color-ash)" }}>{(e.host.display_name ?? e.host.handle ?? "?").slice(0, 1).toUpperCase()}</span>
                </div>
              )}
              {e.host.verified && (
                <BadgeCheck size={16} className="absolute -right-0.5 -bottom-0.5" style={{ color: "var(--color-signal)", background: "var(--color-bone)", borderRadius: 999 }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold leading-tight">{e.host.display_name ?? e.host.handle}</p>
              {e.host.handle && (
                <p className="mono-tag mt-0.5 truncate" style={{ color: "var(--color-ash)" }}>@{e.host.handle}</p>
              )}
              <span className="mt-1.5 inline-block mono-tag" style={{ color: "var(--color-signal)", background: "color-mix(in oklab, var(--color-signal) 12%, transparent)", padding: "2px 8px", borderRadius: 999 }}>
                {(e.host.tier ?? "RIDER").toUpperCase()}
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Link to="/profile" className="tap flex items-center justify-center gap-2 py-3 mono-caps text-[10px] hairline transition-transform active:scale-95" style={{ borderRadius: 999 }}>
              <Eye size={13} style={{ color: "var(--color-signal)" }} />
              <span>VIEW PROFILE</span>
            </Link>
            <Link to="/messages" className="tap flex items-center justify-center gap-2 py-3 mono-caps text-[10px] transition-transform active:scale-95" style={{ background: "var(--color-signal)", color: "var(--color-bone)", borderRadius: 999 }}>
              <Send size={13} />
              <span>MESSAGE</span>
            </Link>
          </div>
        </section>
      )}




      {/* Tabs */}
      <div className="sticky top-0 z-20 hairline-b" style={{ background: "color-mix(in oklab, var(--color-bone) 92%, transparent)", backdropFilter: "blur(12px)" }}>
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-2">
          {TABS.map((t) => {
            const active = tab === t;
            const Icon = TAB_ICONS[t];
            return (
              <button key={t} onClick={() => setTab(t)}
                className="tap relative shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 mono-caps text-[11px] tracking-wider transition-all"
                style={{
                  color: active ? "var(--color-bone, #ffffff)" : "var(--color-ink-2, #4a4a4a)",
                  background: active ? "var(--color-ink, #0a0a0a)" : "transparent",
                }}>
                <Icon size={13} strokeWidth={active ? 2.25 : 1.75} />
                <span>{t}</span>
                {active && <span className="absolute -bottom-2 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full" style={{ background: "var(--color-signal)" }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pb-24">
        {tab === "ABOUT" && <AboutTab e={e} isHost={isHost} onCancel={async () => { if (!confirm("Cancel this event?")) return; await cancelFn({ data: { id } }); qc.invalidateQueries({ queryKey: ["event", id] }); }} />}
        {tab === "LIVE" && <LiveTab eventId={id} isHost={isHost} />}
        {tab === "PHOTOS" && <PhotosTab eventId={id} />}
        {tab === "ATTENDEES" && <AttendeesTab eventId={id} />}
        {tab === "DISCUSSION" && <DiscussionTab eventId={id} />}
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="p-3 text-center">
      <p className="mono-tag" style={{ color: "var(--color-ash)" }}>{k}</p>
      <p className="mono-num mt-1 text-sm font-bold">{v}</p>
    </div>
  );
}

function StatCard({ k, v, active, onClick }: { k: string; v: string; active?: boolean; onClick?: () => void }) {
  const Cmp: any = onClick ? "button" : "div";
  return (
    <Cmp
      onClick={onClick}
      className="tap px-2 py-3 text-center transition-colors"
      style={{ background: active ? "var(--color-mist)" : "transparent" }}
    >
      <p className="mono-num text-base font-bold" style={{ color: active ? "var(--color-signal)" : "var(--color-ink)" }}>{v}</p>
      <p className="mono-tag mt-1" style={{ color: "var(--color-ash)", fontSize: 9 }}>{k}</p>
    </Cmp>
  );
}

function ActionTile({
  onClick, icon, label, variant, disabled, busy, checked,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: "primary";
  disabled?: boolean;
  busy?: boolean;
  checked?: boolean;
}) {
  const isPrimary = variant === "primary";
  const showChecked = isPrimary && checked;
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className="tap group relative flex flex-col items-center justify-center gap-1.5 py-3.5 mono-caps text-[10px] tracking-wider transition-all active:scale-[0.97] disabled:opacity-45 disabled:active:scale-100"
      style={
        isPrimary
          ? {
              background: showChecked ? "var(--color-ink, #0a0a0a)" : "var(--color-signal)",
              color: "var(--color-bone, #ffffff)",
              borderRadius: 14,
              boxShadow: showChecked
                ? "0 0 0 1px var(--color-signal)"
                : "0 6px 18px -8px color-mix(in oklab, var(--color-signal) 55%, transparent)",
            }
          : {
              background: "color-mix(in oklab, var(--color-ink, #0a0a0a) 4%, transparent)",
              color: "var(--color-ink-1, #1a1a1a)",
              borderRadius: 14,
              boxShadow: "inset 0 0 0 1px var(--color-hair)",
            }
      }
    >
      <span
        aria-hidden
        style={{
          color: isPrimary
            ? "var(--color-bone, #ffffff)"
            : disabled
            ? "var(--color-ash)"
            : "var(--color-signal)",
        }}
      >
        {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : showChecked ? <Check size={18} /> : icon}
      </span>
      <span className="text-[10px] font-semibold">{showChecked ? "CHECKED IN" : label}</span>
    </button>
  );
}

function MetricCell({ icon, k, v, active, onClick }: { icon: React.ReactNode; k: string; v: string; active?: boolean; onClick?: () => void }) {
  const Cmp: any = onClick ? "button" : "div";
  return (
    <Cmp onClick={onClick} className="tap flex flex-col items-center justify-center gap-1 px-1 py-2 text-center transition-colors">
      <span style={{ color: active ? "var(--color-signal)" : "var(--color-ash)" }}>{icon}</span>
      <p className="mono-num text-base font-bold leading-none" style={{ color: active ? "var(--color-signal)" : "var(--color-ink)" }}>{v}</p>
      <p className="mono-tag" style={{ color: "var(--color-ash)", fontSize: 9 }}>{k}</p>
    </Cmp>
  );
}

function EventSkeleton() {
  return (
    <div className="event-fade">
      <div className="aspect-[16/10] w-full animate-pulse" style={{ background: "var(--color-mist)" }} />
      <div className="px-4 pt-4 space-y-2">
        <div className="h-6 w-2/3 animate-pulse" style={{ background: "var(--color-mist)" }} />
        <div className="h-3 w-1/2 animate-pulse" style={{ background: "var(--color-mist)" }} />
        <div className="h-3 w-1/3 animate-pulse" style={{ background: "var(--color-mist)" }} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 px-4">
        {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse" style={{ background: "var(--color-mist)" }} />)}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-px px-4">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14 animate-pulse" style={{ background: "var(--color-mist)" }} />)}
      </div>
    </div>
  );
}


function AboutTab({ e, isHost, onCancel }: { e: any; isHost: boolean; onCancel: () => void }) {
  return (
    <div className="px-4 pt-4 space-y-4">
      {e.description && (
        <section>
          <p className="mono-tag" style={{ color: "var(--color-ash)" }}>DESCRIPTION</p>
          <p className="mt-2 text-sm whitespace-pre-wrap">{e.description}</p>
        </section>
      )}
      {e.address && (
        <section className="hairline p-3">
          <p className="mono-tag" style={{ color: "var(--color-ash)" }}>ADDRESS</p>
          <p className="mt-1 text-sm">{e.address}</p>
        </section>
      )}
      {(e.hashtags?.length ?? 0) > 0 && (
        <section>
          <p className="mono-tag" style={{ color: "var(--color-ash)" }}>TAGS</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {e.hashtags.map((h: string) => (
              <span key={h} className="hairline px-2 py-1 mono-tag">#{h}</span>
            ))}
          </div>
        </section>
      )}
      {e.rules && (
        <section className="hairline p-3">
          <p className="mono-tag" style={{ color: "var(--color-ash)" }}>RULES</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{e.rules}</p>
        </section>
      )}
      {(e.contact_email || e.contact_phone) && (
        <section className="hairline p-3">
          <p className="mono-tag" style={{ color: "var(--color-ash)" }}>CONTACT</p>
          {e.contact_email && <p className="mt-1 text-sm">{e.contact_email}</p>}
          {e.contact_phone && <p className="text-sm">{e.contact_phone}</p>}
        </section>
      )}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="hairline p-3">
          <p className="mono-tag" style={{ color: "var(--color-ash)" }}>CATEGORY</p>
          <p className="mt-1 font-bold">{(e.category ?? "other").toUpperCase()}</p>
        </div>
        <div className="hairline p-3">
          <p className="mono-tag" style={{ color: "var(--color-ash)" }}>VISIBILITY</p>
          <p className="mt-1 font-bold">{(e.visibility ?? "public").toUpperCase()}</p>
        </div>
        {e.max_attendees && (
          <div className="hairline p-3">
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>CAPACITY</p>
            <p className="mt-1 font-bold">{e.max_attendees}</p>
          </div>
        )}
        {e.ends_at && (
          <div className="hairline p-3">
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>ENDS</p>
            <p className="mt-1 font-bold">{new Date(e.ends_at).toLocaleString()}</p>
          </div>
        )}
      </div>
      {isHost && e.status !== "cancelled" && (
        <button onClick={onCancel} className="w-full hairline py-3 mono-caps" style={{ color: "#c33" }}>
          CANCEL EVENT
        </button>
      )}
    </div>
  );
}

function LiveTab({ eventId, isHost }: { eventId: string; isHost: boolean }) {
  const list = useServerFn(listAnnouncements);
  const announce = useServerFn(announceEvent);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["event-announcements", eventId], queryFn: () => list({ data: { event_id: eventId } }) });
  const [body, setBody] = useState("");
  async function post() {
    if (!body.trim()) return;
    try { await announce({ data: { event_id: eventId, body } }); setBody(""); qc.invalidateQueries({ queryKey: ["event-announcements", eventId] }); }
    catch (e: any) { alert(e?.message ?? "Only the host can post announcements"); }
  }
  return (
    <div className="px-4 pt-4 space-y-3">
      {isHost && (
        <div className="hairline p-3">
          <p className="mono-tag" style={{ color: "var(--color-ash)" }}>ORGANIZER ANNOUNCEMENT</p>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Send a live update…"
            className="mt-2 w-full bg-transparent text-sm" />
          <button onClick={post} className="btn-solid mt-2" style={{ padding: "8px 12px", fontSize: 10 }}>BROADCAST ▸</button>
        </div>
      )}
      {(data ?? []).length === 0 && (
        <p className="mono-tag text-center py-6" style={{ color: "var(--color-ash)" }}>NO ANNOUNCEMENTS YET</p>
      )}
      {(data ?? []).map((a: any) => (
        <div key={a.id} className="hairline p-3">
          <p className="mono-tag" style={{ color: "var(--color-signal)" }}>
            {new Date(a.created_at).toLocaleString()}
          </p>
          {a.title && <p className="mt-1 font-bold">{a.title}</p>}
          <p className="mt-1 text-sm whitespace-pre-wrap">{a.body}</p>
        </div>
      ))}
    </div>
  );
}

function PhotosTab({ eventId }: { eventId: string }) {
  const list = useServerFn(listEventPhotos);
  const add = useServerFn(addEventPhoto);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["event-photos", eventId], queryFn: () => list({ data: { event_id: eventId } }) });
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(f: File | null) {
    if (!f) return;
    setErr(null);
    try {
      setUploading(true); setPct(0);
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) throw new Error("Sign in required");
      const { uploadWithRetry, compressImage } = await import("@/lib/media-upload");
      const blob = f.type.startsWith("image/") ? await compressImage(f) : f;
      const res = await uploadWithRetry(blob, { userId: uid, bucket: "posts", onProgress: (p) => setPct(Math.round(p.pct * 100)) });
      await add({ data: { event_id: eventId, media_url: res.url, media_type: res.contentType.startsWith("video/") ? "video" : "image" } });
      qc.invalidateQueries({ queryKey: ["event-photos", eventId] });
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally { setUploading(false); }
  }

  return (
    <div className="px-4 pt-4">
      <label className="hairline flex items-center justify-between p-3 cursor-pointer">
        <div>
          <p className="mono-tag" style={{ color: "var(--color-ash)" }}>UPLOAD PHOTO / VIDEO</p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-ash)" }}>JPG · PNG · WEBP · MP4 · WEBM</p>
        </div>
        <span className="btn-solid" style={{ padding: "8px 12px", fontSize: 10 }}>
          {uploading ? `${pct}%` : "CHOOSE FILE ▸"}
        </span>
        <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden disabled={uploading}
          onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; onFile(f ?? null); }} />
      </label>
      {err && <p className="mono-tag mt-2" style={{ color: "#c33" }}>{err}</p>}
      <div className="mt-4 grid grid-cols-3 gap-1">
        {(data ?? []).map((p: any) => (
          p.media_type === "video" ? (
            <video key={p.id} src={p.media_url} className="aspect-square w-full object-cover" muted playsInline />
          ) : (
            <img key={p.id} src={p.media_url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
          )
        ))}
      </div>
      {(data ?? []).length === 0 && !uploading && (
        <p className="mono-tag text-center py-10" style={{ color: "var(--color-ash)" }}>NO PHOTOS YET</p>
      )}
    </div>
  );
}


function AttendeesTab({ eventId }: { eventId: string }) {
  const list = useServerFn(listAttendees);
  const { data } = useQuery({ queryKey: ["event-attendees", eventId], queryFn: () => list({ data: { event_id: eventId, status: "going" } }) });
  return (
    <div className="px-4 pt-4 space-y-2">
      {(data ?? []).length === 0 && <p className="mono-tag text-center py-6" style={{ color: "var(--color-ash)" }}>NO ATTENDEES YET</p>}
      {(data ?? []).map((a: any) => (
        <div key={a.user_id} className="hairline p-3 flex items-center gap-3">
          {a.profiles?.avatar_url ? (
            <img src={a.profiles.avatar_url} alt="" className="h-9 w-9 object-cover" />
          ) : (
            <div className="h-9 w-9" style={{ background: "var(--color-mist)" }} />
          )}
          <div className="flex-1">
            <p className="text-sm font-bold">{a.profiles?.display_name ?? a.profiles?.handle}</p>
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>@{a.profiles?.handle}</p>
          </div>
          <span className="mono-tag" style={{ color: "var(--color-signal)" }}>{(a.profiles?.tier ?? "RIDER").toUpperCase()}</span>
        </div>
      ))}
    </div>
  );
}

function DiscussionTab({ eventId }: { eventId: string }) {
  const list = useServerFn(listEventComments);
  const comment = useServerFn(commentOnEvent);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["event-comments", eventId], queryFn: () => list({ data: { event_id: eventId } }) });
  const [body, setBody] = useState("");
  async function send() {
    if (!body.trim()) return;
    await comment({ data: { event_id: eventId, body } });
    setBody("");
    qc.invalidateQueries({ queryKey: ["event-comments", eventId] });
  }
  return (
    <div className="px-4 pt-4 space-y-3">
      <div className="hairline p-3 flex gap-2">
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Say something…" className="flex-1 bg-transparent text-sm" />
        <button onClick={send} className="btn-solid" style={{ padding: "6px 10px", fontSize: 10 }}>POST ▸</button>
      </div>
      {(data ?? []).length === 0 && <p className="mono-tag text-center py-6" style={{ color: "var(--color-ash)" }}>NO COMMENTS YET</p>}
      {(data ?? []).map((c: any) => (
        <div key={c.id} className="hairline p-3">
          <div className="flex items-center gap-2">
            {c.profiles?.avatar_url ? (
              <img src={c.profiles.avatar_url} alt="" className="h-7 w-7 object-cover" />
            ) : (
              <div className="h-7 w-7" style={{ background: "var(--color-mist)" }} />
            )}
            <p className="text-xs font-bold">{c.profiles?.display_name ?? c.profiles?.handle}</p>
            <span className="mono-tag" style={{ color: "var(--color-ash)" }}>{new Date(c.created_at).toLocaleString()}</span>
          </div>
          <p className="mt-2 text-sm whitespace-pre-wrap">{c.body}</p>
        </div>
      ))}
    </div>
  );
}
