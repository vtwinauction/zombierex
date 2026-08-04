import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyCollabInbox } from "@/lib/creator.functions";

export const Route = createFileRoute("/_authenticated/creator/collabs")({
  head: () => ({ meta: [{ title: "Collab Inbox · ZOMBIEREX" }] }),
  component: CollabsPage,
});

const STATUSES = ["all", "new", "read", "replied", "accepted", "declined", "archived"] as const;

function CollabsPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const list = useServerFn(listMyCollabInbox);
  const { data, isLoading } = useQuery({
    queryKey: ["collab-inbox", status],
    queryFn: () => list({ data: { status } }),
  });

  return (
    <div className="pb-24">
      <div className="px-4 pt-6">
        <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
          {(data ?? []).length} MESSAGES
        </p>
        <h1 className="serif mt-2 text-4xl italic" style={{ color: "var(--color-ink)" }}>
          Collab Inbox
        </h1>
      </div>

      <div
        className="no-scrollbar mt-4 flex overflow-x-auto border-y"
        style={{ borderColor: "var(--color-hair)" }}
      >
        {STATUSES.map((s) => {
          const active = status === s;
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className="tap relative shrink-0 border-r px-4 py-3 mono-tag font-bold"
              style={{
                borderColor: "var(--color-hair)",
                color: active ? "var(--color-ink)" : "var(--color-titanium)",
                background: active ? "rgba(255,255,255,0.03)" : "transparent",
              }}
            >
              {s.toUpperCase()}
              {active && (
                <span
                  className="absolute inset-x-0 bottom-0 h-[2px]"
                  style={{ background: "var(--color-neon)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-4 space-y-2">
        {isLoading && (
          <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
            LOADING…
          </p>
        )}
        {!isLoading && (data ?? []).length === 0 && (
          <div
            className="border border-dashed p-6 text-center"
            style={{ borderColor: "var(--color-hair-strong)" }}
          >
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
              NO REQUESTS
            </p>
          </div>
        )}
        {(data ?? []).map((r: any) => (
          <article
            key={r.id}
            className="border p-3"
            style={{
              borderColor: "var(--color-hair-strong)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {r.sender?.avatar_url ? (
                  <img
                    src={r.sender.avatar_url}
                    className="h-8 w-8 object-cover"
                    style={{ filter: "grayscale(0.2)" }}
                  />
                ) : (
                  <div className="h-8 w-8" style={{ background: "var(--color-slate)" }} />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--color-ink)" }}>
                    {r.sender?.display_name ?? r.sender?.handle ?? "Anonymous"}
                  </p>
                  <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span
                className="mono-tag font-bold px-2 py-0.5"
                style={{
                  background: r.status === "new" ? "var(--color-neon)" : "rgba(255,255,255,0.05)",
                  color: r.status === "new" ? "#0a0a0a" : "var(--color-ink)",
                }}
              >
                {String(r.status).toUpperCase()}
              </span>
            </div>
            <p className="mt-2 font-bold" style={{ color: "var(--color-ink)" }}>
              {r.subject}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--color-silver)" }}>
              {r.message}
            </p>
            {r.budget_cents != null && (
              <p className="mt-2 mono-tag font-bold" style={{ color: "var(--color-neon)" }}>
                BUDGET · ${(r.budget_cents / 100).toFixed(2)}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
