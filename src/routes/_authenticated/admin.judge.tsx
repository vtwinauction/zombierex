import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { redirect } from "@tanstack/react-router";
import {
  adminJudgeListEvents,
  adminJudgeUpsertEvent,
  adminJudgeComputeAwards,
  adminJudgePublishEvent,
  adminJudgeSetEnabled,
  adminJudgeExportCsv,
} from "@/lib/judge-admin.functions";
import { judgeIsEnabled } from "@/lib/judge.functions";

const flagQ = queryOptions({ queryKey: ["judge-enabled-admin"], queryFn: () => judgeIsEnabled() });
const eventsQ = queryOptions({
  queryKey: ["admin-judge-events"],
  queryFn: () => adminJudgeListEvents(),
});

export const Route = createFileRoute("/_authenticated/admin/judge")({
  head: () => ({
    meta: [{ title: "Judge Admin · ZOMBIEREX" }, { name: "robots", content: "noindex" }],
  }),
  loader: async ({ context }) => {
    try {
      await Promise.all([
        context.queryClient.ensureQueryData(flagQ),
        context.queryClient.ensureQueryData(eventsQ),
      ]);
    } catch (e: any) {
      if (String(e?.message ?? "").includes("Forbidden")) throw redirect({ to: "/" });
      throw e;
    }
  },
  component: JudgeAdmin,
});

function JudgeAdmin() {
  const qc = useQueryClient();
  const { data: flag } = useSuspenseQuery(flagQ);
  const { data: events } = useSuspenseQuery(eventsQ);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setFlagMut = useMutation({
    mutationFn: (enabled: boolean) => adminJudgeSetEnabled({ data: { enabled } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["judge-enabled-admin"] }),
    onError: (e: any) => setErr(String(e?.message ?? e)),
  });

  return (
    <div className="pb-24">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ JUDGE ADMIN
        </p>
        <h1 className="serif mt-2 text-3xl" style={{ color: "var(--color-ink)" }}>
          AI Judge control
        </h1>
      </header>

      <div
        className="mx-5 mt-5 p-4 surface-1 lift-1 flex items-center justify-between"
        style={{ borderRadius: 10 }}
      >
        <div>
          <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
            MODULE STATE
          </p>
          <p
            className="serif text-xl mt-1"
            style={{ color: flag.enabled ? "var(--color-neon)" : "var(--color-ink)" }}
          >
            {flag.enabled ? "ENABLED" : "DISABLED"}
          </p>
        </div>
        <button
          onClick={() => setFlagMut.mutate(!flag.enabled)}
          disabled={setFlagMut.isPending}
          className="px-4 py-2 mono-tag"
          style={{
            background: "var(--color-obsidian)",
            color: "var(--color-neon)",
            borderRadius: 8,
          }}
        >
          {flag.enabled ? "DISABLE" : "ENABLE"}
        </button>
      </div>

      {err && (
        <div
          className="mx-5 mt-4 p-3 text-[12px]"
          style={{ background: "#3a0f0f", color: "#ffb0b0", borderRadius: 8 }}
        >
          {err}
        </div>
      )}

      <section className="mt-6 px-5">
        <div className="flex justify-between items-center mb-2">
          <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
            EVENTS · {events.length}
          </p>
          <button
            onClick={() => setCreating((v) => !v)}
            className="chip"
            style={{
              background: "var(--color-obsidian)",
              color: "var(--color-neon)",
              borderColor: "var(--color-obsidian)",
            }}
          >
            {creating ? "Cancel" : "+ New event"}
          </button>
        </div>

        {creating && (
          <EventForm
            onDone={() => {
              setCreating(false);
              qc.invalidateQueries({ queryKey: ["admin-judge-events"] });
            }}
            onError={setErr}
          />
        )}

        <div className="space-y-2 mt-3">
          {events.length === 0 && (
            <div className="p-6 surface-1 lift-1 text-center" style={{ borderRadius: 10 }}>
              <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
                No events yet.
              </p>
            </div>
          )}
          {events.map((e: any) => (
            <EventRow key={e.id} event={e} onError={setErr} />
          ))}
        </div>
      </section>
    </div>
  );
}

function EventRow({ event, onError }: { event: any; onError: (m: string) => void }) {
  const qc = useQueryClient();
  const compute = useMutation({
    mutationFn: () => adminJudgeComputeAwards({ data: { event_id: event.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-judge-events"] }),
    onError: (e: any) => onError(String(e?.message ?? e)),
  });
  const publish = useMutation({
    mutationFn: () => adminJudgePublishEvent({ data: { event_id: event.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-judge-events"] }),
    onError: (e: any) => onError(String(e?.message ?? e)),
  });

  async function exportCsv() {
    try {
      const r = await adminJudgeExportCsv({ data: { event_id: event.id } });
      const csv = typeof r === "string" ? r : (r as any).csv;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.slug}-entries.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      onError(String(e?.message ?? e));
    }
  }

  return (
    <div className="p-4 surface-1 lift-1" style={{ borderRadius: 10 }}>
      <div className="flex justify-between">
        <div>
          <p className="serif text-[15px]" style={{ color: "var(--color-ink)" }}>
            {event.title}
          </p>
          <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 10 }}>
            {event.slug} · {(event.vehicle_types ?? []).join("/")}
          </p>
        </div>
        <span
          className="mono-tag"
          style={{
            color: event.status === "published" ? "var(--color-neon)" : "var(--color-silver)",
          }}
        >
          {event.status.toUpperCase()}
        </span>
      </div>
      <div className="mt-3 flex gap-2 flex-wrap">
        <button
          onClick={() => compute.mutate()}
          disabled={compute.isPending}
          className="chip"
          style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}
        >
          {compute.isPending ? "Computing…" : "Compute awards"}
        </button>
        <button
          onClick={() => publish.mutate()}
          disabled={publish.isPending}
          className="chip"
          style={{
            background: "var(--color-obsidian)",
            color: "var(--color-neon)",
            borderColor: "var(--color-obsidian)",
          }}
        >
          {publish.isPending ? "Publishing…" : "Publish results"}
        </button>
        <button
          onClick={exportCsv}
          className="chip"
          style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}

function EventForm({ onDone, onError }: { onDone: () => void; onError: (m: string) => void }) {
  const [form, setForm] = useState({
    slug: "",
    title: "",
    description: "",
    vehicle_types: ["motorcycle"] as ("motorcycle" | "car")[],
    status: "open" as "draft" | "open" | "judging" | "published",
  });
  const create = useMutation({
    mutationFn: () => adminJudgeUpsertEvent({ data: form }),
    onSuccess: onDone,
    onError: (e: any) => onError(String(e?.message ?? e)),
  });

  return (
    <div className="p-4 surface-1 lift-1 space-y-3" style={{ borderRadius: 10 }}>
      <Input
        label="Slug"
        v={form.slug}
        on={(v) => setForm((f) => ({ ...f, slug: v.replace(/[^a-z0-9-]/g, "").toLowerCase() }))}
      />
      <Input label="Title" v={form.title} on={(v) => setForm((f) => ({ ...f, title: v }))} />
      <div>
        <p className="mono-tag mb-1" style={{ color: "var(--color-silver)" }}>
          DESCRIPTION
        </p>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 text-[13px]"
          style={{
            background: "var(--color-graphite)",
            border: "1px solid var(--color-hair)",
            borderRadius: 8,
            color: "var(--color-ink)",
          }}
        />
      </div>
      <div>
        <p className="mono-tag mb-1" style={{ color: "var(--color-silver)" }}>
          TYPES
        </p>
        <div className="flex gap-2">
          {(["motorcycle", "car"] as const).map((t) => {
            const on = form.vehicle_types.includes(t);
            return (
              <button
                key={t}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    vehicle_types: on
                      ? f.vehicle_types.filter((x) => x !== t)
                      : [...f.vehicle_types, t],
                  }))
                }
                className="chip"
                style={{
                  background: on ? "var(--color-obsidian)" : "transparent",
                  color: on ? "var(--color-neon)" : "var(--color-ink)",
                  borderColor: on ? "var(--color-obsidian)" : "var(--color-hair-strong)",
                }}
              >
                {t.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mono-tag mb-1" style={{ color: "var(--color-silver)" }}>
          STATUS
        </p>
        <select
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
          className="w-full px-3 py-2 text-[13px]"
          style={{
            background: "var(--color-graphite)",
            border: "1px solid var(--color-hair)",
            borderRadius: 8,
            color: "var(--color-ink)",
          }}
        >
          <option value="draft">draft</option>
          <option value="open">open</option>
          <option value="judging">judging</option>
          <option value="published">published</option>
        </select>
      </div>
      <button
        onClick={() => create.mutate()}
        disabled={!form.slug || !form.title || create.isPending}
        className="w-full py-2 mono-tag"
        style={{ background: "var(--color-neon)", color: "var(--color-obsidian)", borderRadius: 8 }}
      >
        {create.isPending ? "SAVING…" : "CREATE EVENT"}
      </button>
    </div>
  );
}

function Input({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return (
    <div>
      <p className="mono-tag mb-1" style={{ color: "var(--color-silver)" }}>
        {label.toUpperCase()}
      </p>
      <input
        value={v}
        onChange={(e) => on(e.target.value)}
        className="w-full px-3 py-2 text-[13px]"
        style={{
          background: "var(--color-graphite)",
          border: "1px solid var(--color-hair)",
          borderRadius: 8,
          color: "var(--color-ink)",
        }}
      />
    </div>
  );
}
