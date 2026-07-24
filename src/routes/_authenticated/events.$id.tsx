import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatusBar } from "@/components/StatusBar";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth-context";
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
  head: () => ({ meta: [{ title: "Event · ZOMBIEREX" }] }),
  component: EventDetail,
});

const TABS = ["ABOUT", "LIVE", "PHOTOS", "ATTENDEES", "DISCUSSION"] as const;

function EventDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const get = useServerFn(getEvent);
  const rsvpFn = useServerFn(rsvpEvent);
  const checkInFn = useServerFn(checkInEvent);
  const cancelFn = useServerFn(cancelEvent);

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

  if (isLoading) return <div className="p-6"><p className="mono-tag" style={{ color: "var(--color-ash)" }}>LOADING…</p></div>;
  if (!ev) return (
    <div className="p-6">
      <p className="mono-tag" style={{ color: "var(--color-ash)" }}>NOT FOUND</p>
      <Link to="/events" className="btn-solid mt-4 inline-block" style={{ padding: "8px 12px", fontSize: 10 }}>← EVENTS</Link>
    </div>
  );

  const e: any = ev;
  const { user } = useSession();
  const isHost = !!user && user.id === e.host_id;
  const d = new Date(e.starts_at);

  async function doRsvp(status: "going" | "interested" | "not_going") {
    await rsvpFn({ data: { event_id: id, status } });
    qc.invalidateQueries({ queryKey: ["event", id] });
  }

  async function doCheckIn() {
    if (!navigator.geolocation) { await checkInFn({ data: { event_id: id } }); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => { await checkInFn({ data: { event_id: id, lat: pos.coords.latitude, lng: pos.coords.longitude } }); },
      async () => { await checkInFn({ data: { event_id: id } }); },
      { timeout: 4000 }
    );
  }

  return (
    <div>
      <StatusBar index="06" section="EVENT" />

      <div className="relative h-80">
        {e.cover_url ? (
          <img src={e.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center" style={{ background: "var(--color-mist)" }}>
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>NO COVER PHOTO</p>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 30%, rgba(0,0,0,0.9) 100%)" }} />

        {/* Top action bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3">
          <button onClick={() => navigate({ to: "/events" })} className="tap mono-tag text-white" style={{ background: "rgba(0,0,0,0.55)", padding: "6px 10px", backdropFilter: "blur(6px)" }}>
            ← BACK
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const url = typeof window !== "undefined" ? window.location.href : "";
                if (navigator.share) navigator.share({ title: e.title, url });
                else navigator.clipboard?.writeText(url);
              }}
              className="tap mono-tag text-white"
              style={{ background: "rgba(0,0,0,0.55)", padding: "6px 10px", backdropFilter: "blur(6px)" }}
            >
              SHARE
            </button>
            {isHost && (
              <Link
                to="/events/$id/edit"
                params={{ id }}
                className="tap mono-tag"
                style={{ background: "var(--color-signal)", color: "var(--color-bone)", padding: "6px 10px" }}
              >
                ✎ EDIT
              </Link>
            )}
          </div>
        </div>

        {/* Bottom overlay meta */}
        <div className="absolute inset-x-4 bottom-4 text-white">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mono-tag" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "3px 8px", backdropFilter: "blur(6px)" }}>
              {(e.category ?? "EVENT").toUpperCase()}
            </span>
            {e.status === "cancelled" ? (
              <span className="mono-tag" style={{ background: "#c33", color: "#fff", padding: "3px 8px" }}>CANCELLED</span>
            ) : (
              <span className="mono-tag" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "3px 8px", backdropFilter: "blur(6px)" }}>
                {(e.visibility ?? "public").toUpperCase()}
              </span>
            )}
            {e.is_featured && (
              <span className="mono-tag" style={{ background: "var(--color-signal)", color: "var(--color-bone)", padding: "3px 8px" }}>FEATURED</span>
            )}
          </div>
          <h1 className="mt-2 display-xl text-3xl uppercase leading-tight">{e.title}</h1>
          <p className="mono-tag mt-1.5" style={{ color: "rgba(255,255,255,0.9)" }}>
            {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          {e.location && <p className="mono-tag mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>◎ {e.location}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-hair hairline-b">
        <Stat k="GOING" v={String(e.rsvp_count ?? 0)} />
        <Stat k="PHOTOS" v={String(e.photos_count ?? 0)} />
        <Stat k="COMMENTS" v={String(e.comments_count ?? 0)} />
      </div>

      {/* RSVP bar */}
      <div className="grid grid-cols-3 divide-x divide-hair hairline-b">
        {(["going", "interested", "not_going"] as const).map((s) => {
          const active = e.my_rsvp === s;
          const label = s === "going" ? "GOING" : s === "interested" ? "INTERESTED" : "CAN'T GO";
          return (
            <button key={s} onClick={() => doRsvp(s)} className="tap py-4 mono-caps"
              style={{ background: active ? "var(--color-signal)" : "transparent", color: active ? "var(--color-bone)" : "var(--color-ink)" }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Secondary actions */}
      <div className="grid grid-cols-2 divide-x divide-hair hairline-b">
        <button onClick={doCheckIn} className="tap py-3 mono-caps">◉ CHECK IN</button>
        {e.gps_lat && e.gps_lng ? (
          <a href={`https://maps.google.com/?q=${e.gps_lat},${e.gps_lng}`} target="_blank" rel="noreferrer" className="tap py-3 mono-caps text-center">◎ NAVIGATE</a>
        ) : e.address ? (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(e.address)}`} target="_blank" rel="noreferrer" className="tap py-3 mono-caps text-center">◎ NAVIGATE</a>
        ) : (
          <button disabled className="tap py-3 mono-caps" style={{ color: "var(--color-ash)" }}>◎ NAVIGATE</button>
        )}
      </div>


      {/* Host card */}
      {e.host && (
        <Link to="/profile" className="flex items-center gap-3 px-4 py-4 hairline-b">
          {e.host.avatar_url ? (
            <img src={e.host.avatar_url} alt="" className="h-10 w-10 object-cover" style={{ borderRadius: 0 }} />
          ) : (
            <div className="h-10 w-10" style={{ background: "var(--color-mist)" }} />
          )}
          <div className="flex-1">
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>HOSTED BY</p>
            <p className="text-sm font-bold">{e.host.display_name ?? e.host.handle}</p>
          </div>
          <span className="mono-tag" style={{ color: "var(--color-signal)" }}>{(e.host.tier ?? "RIDER").toUpperCase()}</span>
        </Link>
      )}

      {/* Tabs */}
      <div className="no-scrollbar flex overflow-x-auto hairline-b">
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)}
              className="tap relative shrink-0 border-r border-hair px-4 py-3 mono-caps"
              style={{ color: active ? "var(--color-ink)" : "var(--color-ash)", background: active ? "var(--color-mist)" : "transparent" }}>
              {t}
              {active && <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: "var(--color-signal)" }} />}
            </button>
          );
        })}
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

function AboutTab({ e, onCancel }: { e: any; onCancel: () => void }) {
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
      {e.status !== "cancelled" && (
        <button onClick={onCancel} className="w-full hairline py-3 mono-caps" style={{ color: "#c33" }}>
          CANCEL EVENT (HOST ONLY)
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
      <div className="hairline p-3">
        <p className="mono-tag" style={{ color: "var(--color-ash)" }}>ORGANIZER ANNOUNCEMENT</p>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Send a live update…"
          className="mt-2 w-full bg-transparent text-sm" />
        <button onClick={post} className="btn-solid mt-2" style={{ padding: "8px 12px", fontSize: 10 }}>BROADCAST ▸</button>
      </div>
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
