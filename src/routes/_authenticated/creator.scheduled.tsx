import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { listMyScheduled, schedulePost, cancelScheduled } from "@/lib/creator.functions";
import { PullToRefresh } from "@/components/PullToRefresh";
import { confirmDialog } from "@/lib/confirm";

export const Route = createFileRoute("/_authenticated/creator/scheduled")({
  head: () => ({
    meta: [
      { title: "Scheduled Posts · ZOMBIEREX" },
      {
        name: "description",
        content:
          "Queue posts to publish automatically. Manage, edit, or cancel your scheduled content.",
      },
    ],
  }),
  component: ScheduledPage,
});

type ScheduledRow = {
  id: string;
  kind: string;
  caption: string | null;
  media_urls: string[];
  publish_at: string;
  status: string;
  error: string | null;
  published_post_id: string | null;
  visibility: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function ScheduledPage() {
  const qc = useQueryClient();
  const list = useServerFn(listMyScheduled);
  const create = useServerFn(schedulePost);
  const cancel = useServerFn(cancelScheduled);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["scheduled-posts"],
    queryFn: () => list(),
  });

  const rows = (data ?? []) as ScheduledRow[];
  const upcoming = rows.filter((r) => r.status === "scheduled");
  const past = rows.filter((r) => r.status !== "scheduled");

  const defaultWhen = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0, 0, 0);
    return toLocalInput(d);
  }, []);
  const [kind, setKind] = useState<"photo" | "video" | "telemetry" | "event">("photo");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [when, setWhen] = useState(defaultWhen);

  const scheduleMut = useMutation({
    mutationFn: async () => {
      const iso = new Date(when).toISOString();
      if (new Date(iso).getTime() <= Date.now() + 30_000) {
        throw new Error("Pick a time at least a minute in the future");
      }
      return create({
        data: {
          kind,
          caption: caption || null,
          media_urls: mediaUrl ? [mediaUrl] : [],
          hashtags: [],
          visibility: "public",
          club_id: null,
          is_subscribers_only: false,
          publish_at: iso,
        },
      });
    },
    onSuccess: () => {
      toast.success("Post scheduled");
      setCaption("");
      setMediaUrl("");
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => cancel({ data: { id } }),
    onSuccess: () => {
      toast.success("Scheduled post cancelled");
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PullToRefresh
      onRefresh={async () => {
        await refetch();
      }}
    >
      <div className="pb-24">
        <div className="flex items-end justify-between px-4 pt-6">
          <div>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
              QUEUE
            </p>
            <h1 className="serif mt-2 text-4xl italic" style={{ color: "var(--color-ink)" }}>
              Scheduled
            </h1>
          </div>
          <Link
            to="/creator/dashboard"
            className="mono-tag"
            style={{ color: "var(--color-titanium)" }}
          >
            ← Dashboard
          </Link>
        </div>

        <section
          className="mx-4 mt-6 border p-4"
          style={{ borderColor: "var(--color-hair-strong)", background: "var(--color-graphite)" }}
        >
          <p className="mono-tag mb-3" style={{ color: "var(--color-neon)" }}>
            NEW SCHEDULE
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-1">
              <span className="mono-tag" style={{ color: "var(--color-silver)" }}>
                TYPE
              </span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
                className="mt-1 w-full rounded-md px-2 py-2 text-[14px]"
                style={{
                  background: "var(--color-obsidian)",
                  color: "var(--color-ink)",
                  border: "1px solid var(--color-hair-strong)",
                }}
              >
                <option value="photo">Photo</option>
                <option value="video">Video</option>
                <option value="telemetry">Telemetry</option>
                <option value="event">Event</option>
              </select>
            </label>
            <label className="col-span-1">
              <span className="mono-tag" style={{ color: "var(--color-silver)" }}>
                PUBLISH AT
              </span>
              <input
                type="datetime-local"
                value={when}
                min={defaultWhen}
                onChange={(e) => setWhen(e.target.value)}
                className="mt-1 w-full rounded-md px-2 py-2 text-[14px]"
                style={{
                  background: "var(--color-obsidian)",
                  color: "var(--color-ink)",
                  border: "1px solid var(--color-hair-strong)",
                }}
              />
            </label>
            <label className="col-span-2">
              <span className="mono-tag" style={{ color: "var(--color-silver)" }}>
                CAPTION
              </span>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                maxLength={2200}
                placeholder="Write something…"
                className="mt-1 w-full rounded-md px-2 py-2 text-[14px]"
                style={{
                  background: "var(--color-obsidian)",
                  color: "var(--color-ink)",
                  border: "1px solid var(--color-hair-strong)",
                }}
              />
            </label>
            <label className="col-span-2">
              <span className="mono-tag" style={{ color: "var(--color-silver)" }}>
                MEDIA URL (OPTIONAL)
              </span>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1 w-full rounded-md px-2 py-2 text-[14px]"
                style={{
                  background: "var(--color-obsidian)",
                  color: "var(--color-ink)",
                  border: "1px solid var(--color-hair-strong)",
                }}
              />
            </label>
          </div>
          <button
            onClick={() => scheduleMut.mutate()}
            disabled={scheduleMut.isPending || (!caption && !mediaUrl)}
            className="btn-neon mt-4 w-full"
            style={{
              padding: "12px",
              fontSize: 12,
              opacity: scheduleMut.isPending || (!caption && !mediaUrl) ? 0.6 : 1,
            }}
          >
            {scheduleMut.isPending ? "SCHEDULING…" : "SCHEDULE POST ▸"}
          </button>
        </section>

        <section className="mx-4 mt-6">
          <p className="mono-tag mb-2" style={{ color: "var(--color-titanium)" }}>
            UPCOMING · {upcoming.length}
          </p>
          {isLoading && (
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
              LOADING…
            </p>
          )}
          {!isLoading && upcoming.length === 0 && (
            <div
              className="border border-dashed p-6 text-center"
              style={{ borderColor: "var(--color-hair-strong)" }}
            >
              <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
                No posts scheduled yet.
              </p>
            </div>
          )}
          <ul className="space-y-2">
            {upcoming.map((r) => (
              <li
                key={r.id}
                className="border p-3 flex items-start gap-3"
                style={{
                  borderColor: "var(--color-hair-strong)",
                  background: "var(--color-graphite)",
                }}
              >
                {r.media_urls?.[0] && (
                  <img
                    src={r.media_urls[0]}
                    alt=""
                    className="h-14 w-14 rounded object-cover flex-none"
                    style={{ background: "var(--color-obsidian)" }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
                    {r.kind.toUpperCase()} · {fmtWhen(r.publish_at)}
                  </p>
                  <p
                    className="mt-1 text-[13px] line-clamp-2"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {r.caption || <em style={{ color: "var(--color-silver)" }}>No caption</em>}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const ok = await confirmDialog({
                      title: "Cancel scheduled post?",
                      description: "This won't publish and can't be undone from here.",
                      confirmLabel: "Cancel post",
                      destructive: true,
                    });
                    if (ok) cancelMut.mutate(r.id);
                  }}
                  className="mono-tag px-3 py-2 flex-none"
                  style={{
                    color: "var(--color-silver)",
                    border: "1px solid var(--color-hair-strong)",
                  }}
                >
                  CANCEL
                </button>
              </li>
            ))}
          </ul>
        </section>

        {past.length > 0 && (
          <section className="mx-4 mt-6">
            <p className="mono-tag mb-2" style={{ color: "var(--color-titanium)" }}>
              HISTORY · {past.length}
            </p>
            <ul className="space-y-2">
              {past.map((r) => (
                <li
                  key={r.id}
                  className="border p-3"
                  style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className="mono-tag"
                      style={{
                        color:
                          r.status === "published"
                            ? "var(--color-neon)"
                            : r.status === "failed"
                              ? "#ff5252"
                              : "var(--color-titanium)",
                      }}
                    >
                      {r.status.toUpperCase()} · {fmtWhen(r.publish_at)}
                    </p>
                    {r.published_post_id && (
                      <Link
                        to="/post/$id"
                        params={{ id: r.published_post_id }}
                        className="mono-tag"
                        style={{ color: "var(--color-titanium)" }}
                      >
                        VIEW ▸
                      </Link>
                    )}
                  </div>
                  <p
                    className="mt-1 text-[13px] line-clamp-2"
                    style={{ color: "var(--color-silver)" }}
                  >
                    {r.caption || "—"}
                  </p>
                  {r.error && (
                    <p className="mt-1 text-[11px]" style={{ color: "#ff8080" }}>
                      Error: {r.error}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PullToRefresh>
  );
}
