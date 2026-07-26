import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { getMessages, sendMessage } from "@/lib/messages.functions";
import { supabase } from "@/integrations/supabase/client";
import { ReportBlockSheet } from "@/components/ReportBlockSheet";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: ({ params }) => ({ meta: [
    { title: "Channel · ZOMBIEREX" },
    { name: "description", content: `Encrypted rider channel ${params.id.slice(0, 8)}.` },
    { property: "og:title", content: "Channel · ZOMBIEREX" },
    { property: "og:description", content: "Encrypted rider channel." },
  ] }),
  component: ChannelPage,
});

function ChannelPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fnGet = useServerFn(getMessages);
  const fnSend = useServerFn(sendMessage);
  const [text, setText] = useState("");
  const [pendingMedia, setPendingMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const meRef = useRef<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMsg, setReportMsg] = useState<{ id: string; authorId?: string } | null>(null);

  const q = useQuery({
    queryKey: ["messages", id],
    queryFn: () => fnGet({ data: { conversationId: id, limit: 100 } }),
    staleTime: 5_000,
  });

  const send = useMutation({
    mutationFn: (payload: { body: string; mediaUrl?: string }) =>
      fnSend({ data: { conversationId: id, body: payload.body, mediaUrl: payload.mediaUrl } }),
    onSuccess: () => {
      setText(""); setPendingMedia(null);
      qc.invalidateQueries({ queryKey: ["messages", id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: any) => setErr(e?.message ?? "Send failed"),
  });

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (mounted) meRef.current = data.user?.id ?? null; });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const ch = supabase.channel(`msg-${id}`, { config: { broadcast: { self: false } } })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["messages", id] }),
      )
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (payload?.payload?.userId && payload.payload.userId !== meRef.current) {
          setPeerTyping(true);
          window.clearTimeout((chanRef as any).__t);
          (chanRef as any).__t = window.setTimeout(() => setPeerTyping(false), 2500);
        }
      })
      .subscribe();
    chanRef.current = ch;
    return () => { supabase.removeChannel(ch); chanRef.current = null; };
  }, [id, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [q.data]);

  function emitTyping() {
    const ch = chanRef.current; if (!ch || !meRef.current) return;
    ch.send({ type: "broadcast", event: "typing", payload: { userId: meRef.current } });
  }

  async function onAttach(f: File | null) {
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
      setPendingMedia({ url: res.url, type: res.contentType.startsWith("video/") ? "video" : "image" });
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally { setUploading(false); }
  }

  const msgs = q.data ?? [];
  const canSend = (text.trim().length > 0 || !!pendingMedia) && !send.isPending && !uploading;

  return (
    <div className="flex flex-col" style={{ minHeight: "100svh" }}>
      <header className="sticky top-0 z-10 hairline-b px-4 py-3 flex items-center gap-3" style={{ background: "var(--color-bone)" }}>
        <Link to="/messages" className="mono-tag" style={{ color: "var(--color-ash)" }}>← BACK</Link>
        <p className="mono-tag" style={{ color: "var(--color-signal)" }}>CH · {id.slice(0, 6).toUpperCase()}</p>
        {peerTyping && <span className="mono-tag ml-auto" style={{ color: "var(--color-ash)" }}>TYPING…</span>}
        <button
          aria-label="More"
          onClick={() => { setReportMsg(null); setReportOpen(true); }}
          className={`tap grid h-8 w-8 place-items-center rounded-full ${peerTyping ? "" : "ml-auto"}`}
          style={{ color: "var(--color-ash)" }}
        >
          <MoreVertical size={16} />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {q.isLoading && <p className="mono-tag text-center" style={{ color: "var(--color-ash)" }}>LOADING…</p>}
        {!q.isLoading && msgs.length === 0 && (
          <p className="mono-tag text-center pt-8" style={{ color: "var(--color-ash)" }}>NO MESSAGES YET</p>
        )}
        {msgs.map((m: any) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[78%]">
              {!m.mine && m.sender && (
                <p className="mono-tag mb-1 px-1 flex items-center gap-2" style={{ color: "var(--color-ash)" }}>
                  <span>{m.sender.display_name ?? m.sender.username ?? "RIDER"}</span>
                  <button
                    aria-label="Report message"
                    onClick={() => { setReportMsg({ id: m.id, authorId: m.sender?.id }); setReportOpen(true); }}
                    className="tap opacity-60 hover:opacity-100"
                  >
                    <MoreVertical size={12} />
                  </button>
                </p>
              )}
              {m.mediaUrl && (
                m.mediaUrl.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                  <video src={m.mediaUrl} controls playsInline className="hairline mb-1 max-h-72 w-full object-cover" />
                ) : (
                  <img src={m.mediaUrl} alt="" className="hairline mb-1 max-h-72 w-full object-cover" loading="lazy" />
                )
              )}
              {m.body && (
                <div className="hairline px-3 py-2 text-sm" style={{
                  background: m.mine ? "var(--color-signal)" : "transparent",
                  color: m.mine ? "var(--color-bone)" : "var(--color-ink)",
                }}>
                  {m.body}
                </div>
              )}
              <p className="mono-tag mt-1 px-1 text-right" style={{ color: "var(--color-ash)" }}>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {pendingMedia && (
        <div className="mx-3 hairline p-2 flex items-center gap-2" style={{ background: "var(--color-mist)" }}>
          {pendingMedia.type === "video" ? (
            <video src={pendingMedia.url} className="h-14 w-14 object-cover" muted />
          ) : (
            <img src={pendingMedia.url} className="h-14 w-14 object-cover" alt="" />
          )}
          <p className="mono-tag flex-1" style={{ color: "var(--color-ash)" }}>ATTACHMENT READY</p>
          <button onClick={() => setPendingMedia(null)} className="mono-tag" style={{ color: "#c33" }}>REMOVE</button>
        </div>
      )}
      {err && <p className="mono-tag px-4 pb-1" style={{ color: "#c33" }}>{err}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSend) return;
          send.mutate({ body: text.trim(), mediaUrl: pendingMedia?.url });
        }}
        className="sticky bottom-0 hairline-t flex items-stretch gap-2 p-3"
        style={{ background: "var(--color-bone)", paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <label className="btn-solid px-3 mono-tag cursor-pointer flex items-center" title="Attach">
          {uploading ? `${pct}%` : "＋"}
          <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; onAttach(f ?? null); }} />
        </label>
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); emitTyping(); }}
          placeholder="Transmit…"
          maxLength={4000}
          className="flex-1 hairline bg-transparent px-3 py-2 text-sm focus:outline-none"
        />
        <button type="submit" disabled={!canSend} className="btn-solid px-4 mono-tag">
          {send.isPending ? "…" : "SEND"}
        </button>
      </form>
    </div>
  );
}
