import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyVehicles } from "@/lib/garage.functions";
import {
  judgeGetEvent,
  judgeCreateEntry,
  judgeSignEntryUpload,
  judgeAttachMedia,
  judgeSubmitEntry,
  judgeListEntryMedia,
} from "@/lib/judge.functions";

const eventQ = (slug: string) =>
  queryOptions({
    queryKey: ["judge-event-submit", slug],
    queryFn: () => judgeGetEvent({ data: { slug } }),
  });

export const Route = createFileRoute("/_authenticated/judge/submit/$eventSlug")({
  head: () => ({
    meta: [{ title: "Submit Entry · AI Judge" }, { name: "robots", content: "noindex" }],
  }),
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(eventQ(params.eventSlug));
    if (!data.event) throw notFound();
    return data;
  },
  component: SubmitWizard,
  notFoundComponent: () => (
    <div className="p-8 text-center text-[13px]" style={{ color: "var(--color-silver)" }}>
      Event not found.
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-[13px]" style={{ color: "var(--color-silver)" }}>
      {String(error?.message ?? error)}
    </div>
  ),
});

type Step = "vehicle" | "media" | "review";
type Kind =
  | "photo_exterior"
  | "photo_interior"
  | "photo_engine"
  | "photo_detail"
  | "video_walkaround"
  | "audio_engine"
  | "audio_exhaust";

const MEDIA_SLOTS: { kind: Kind; label: string; accept: string; hint: string }[] = [
  {
    kind: "photo_exterior",
    label: "Exterior photos",
    accept: "image/*",
    hint: "3/4 front, side, rear (multiple ok)",
  },
  {
    kind: "photo_engine",
    label: "Engine / bay",
    accept: "image/*",
    hint: "Clear shots of engine work",
  },
  { kind: "photo_detail", label: "Detail shots", accept: "image/*", hint: "Paint, badges, wheels" },
  {
    kind: "video_walkaround",
    label: "Walk-around video",
    accept: "video/*",
    hint: "30-90s continuous shot",
  },
  {
    kind: "audio_engine",
    label: "Engine idle audio",
    accept: "audio/*,video/*",
    hint: "10-30s clean idle",
  },
  {
    kind: "audio_exhaust",
    label: "Exhaust / rev",
    accept: "audio/*,video/*",
    hint: "Rev up, decel, blip",
  },
];

function GaragePicker({
  selected,
  onPick,
}: {
  selected: string | null;
  onPick: (v: any | null) => void;
}) {
  const fetchVehicles = useServerFn(listMyVehicles);
  const { data } = useQuery({
    queryKey: ["garage", "mine", "judge-picker"],
    queryFn: () => fetchVehicles(),
    staleTime: 60_000,
  });
  const vehicles: any[] = (data as any)?.vehicles ?? (Array.isArray(data) ? data : []);
  if (!vehicles.length) return null;
  return (
    <div>
      <p className="mono-tag mb-1" style={{ color: "var(--color-silver)" }}>
        FROM YOUR GARAGE
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {vehicles.map((v) => {
          const on = selected === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onPick(on ? null : v)}
              className="chip shrink-0"
              style={{
                background: on ? "var(--color-obsidian)" : "transparent",
                color: on ? "var(--color-neon)" : "var(--color-ink)",
                borderColor: on ? "var(--color-obsidian)" : "var(--color-hair-strong)",
              }}
            >
              {(v.nickname || [v.year, v.make, v.model].filter(Boolean).join(" ") || "VEHICLE").toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SubmitWizard() {
  const { eventSlug } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(eventQ(eventSlug));
  const event = data.event!;

  const [step, setStep] = useState<Step>("vehicle");
  const [entryId, setEntryId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [form, setForm] = useState({
    display_name: "",
    vehicle_type: "motorcycle" as "motorcycle" | "car",
    make: "",
    model: "",
    year: "",
    engine_cc: "",
    country: "",
    city: "",
  });
  const [uploading, setUploading] = useState<Kind | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const mediaQ = queryOptions({
    queryKey: ["judge-entry-media", entryId ?? "none"],
    queryFn: () =>
      entryId
        ? judgeListEntryMedia({ data: { entry_id: entryId } })
        : Promise.resolve({ media: [] as any[], urls: {} as Record<string, string> }),
    enabled: !!entryId,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const r = await judgeCreateEntry({
        data: {
          event_slug: eventSlug,
          vehicle_id: vehicleId,
          display_name: form.display_name.trim(),
          vehicle_type: form.vehicle_type,
          make: form.make || null,
          model: form.model || null,
          year: form.year ? Number(form.year) : null,
          engine_cc: form.engine_cc ? Number(form.engine_cc) : null,
          country: form.country || null,
          city: form.city || null,
        },
      });
      return r;
    },
    onSuccess: (r: any) => {
      setEntryId(r.id ?? r.entry_id);
      setStep("media");
    },
    onError: (e: any) => setErr(String(e?.message ?? e)),
  });

  const submitMut = useMutation({
    mutationFn: () => judgeSubmitEntry({ data: { entry_id: entryId! } }),
    onSuccess: () => nav({ to: "/judge/mine" }),
    onError: (e: any) => setErr(String(e?.message ?? e)),
  });

  async function uploadFile(kind: Kind, file: File) {
    if (!entryId) return;
    setErr(null);
    setUploading(kind);
    try {
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100);
      const signed = await judgeSignEntryUpload({
        data: {
          entry_id: entryId,
          kind,
          filename: safeName,
          content_type: file.type || "application/octet-stream",
        },
      });
      const { error } = await supabase.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type || undefined,
        });
      if (error) throw error;

      await judgeAttachMedia({
        data: {
          entry_id: entryId,
          kind,
          storage_path: signed.path,
          mime: file.type || undefined,
          order_index: 0,
        },
      });
      qc.invalidateQueries({ queryKey: ["judge-entry-media", entryId] });
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="pb-24">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ NEW ENTRY · {event.title.toUpperCase()}
        </p>
        <h1 className="serif mt-2 text-3xl leading-tight" style={{ color: "var(--color-ink)" }}>
          Submit your{" "}
          <span className="italic" style={{ color: "var(--color-neon)" }}>
            build
          </span>
        </h1>
        <div className="mt-4 flex gap-2">
          {(["vehicle", "media", "review"] as Step[]).map((s, i) => (
            <div
              key={s}
              className="flex-1 h-1 rounded"
              style={{
                background:
                  step === s ||
                  (step === "media" && s === "vehicle") ||
                  (step === "review" && s !== "review" ? true : step === s)
                    ? "var(--color-neon)"
                    : "var(--color-hair)",
              }}
            />
          ))}
        </div>
      </header>

      {err && (
        <div
          className="mx-5 mt-4 p-3 text-[12px]"
          style={{ background: "#3a0f0f", color: "#ffb0b0", borderRadius: 8 }}
        >
          {err}
        </div>
      )}

      {step === "vehicle" && (
        <section className="px-5 mt-6 space-y-3">
          <GaragePicker
            selected={vehicleId}
            onPick={(v) => {
              setVehicleId(v?.id ?? null);
              if (v)
                setForm((f) => ({
                  ...f,
                  display_name: f.display_name || v.nickname || [v.year, v.make, v.model].filter(Boolean).join(" "),
                  vehicle_type: v.kind === "car" ? "car" : "motorcycle",
                  make: v.make ?? f.make,
                  model: v.model ?? f.model,
                  year: v.year ? String(v.year) : f.year,
                }));
            }}
          />
          <Field
            label="Build name *"
            value={form.display_name}
            onChange={(v) => setForm((f) => ({ ...f, display_name: v }))}
            placeholder="Blood Moon CB750"
          />
          <div>
            <p className="mono-tag mb-1" style={{ color: "var(--color-silver)" }}>
              VEHICLE TYPE
            </p>
            <div className="flex gap-2">
              {(["motorcycle", "car"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, vehicle_type: t }))}
                  className="chip flex-1"
                  style={{
                    background: form.vehicle_type === t ? "var(--color-obsidian)" : "transparent",
                    color: form.vehicle_type === t ? "var(--color-neon)" : "var(--color-ink)",
                    borderColor:
                      form.vehicle_type === t
                        ? "var(--color-obsidian)"
                        : "var(--color-hair-strong)",
                  }}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Make"
              value={form.make}
              onChange={(v) => setForm((f) => ({ ...f, make: v }))}
              placeholder="Honda"
            />
            <Field
              label="Model"
              value={form.model}
              onChange={(v) => setForm((f) => ({ ...f, model: v }))}
              placeholder="CB750"
            />
            <Field
              label="Year"
              value={form.year}
              onChange={(v) => setForm((f) => ({ ...f, year: v.replace(/\D/g, "") }))}
              placeholder="1978"
            />
            <Field
              label="Engine (cc)"
              value={form.engine_cc}
              onChange={(v) => setForm((f) => ({ ...f, engine_cc: v.replace(/\D/g, "") }))}
              placeholder="750"
            />
            <Field
              label="City"
              value={form.city}
              onChange={(v) => setForm((f) => ({ ...f, city: v }))}
              placeholder="Milan"
            />
            <Field
              label="Country"
              value={form.country}
              onChange={(v) => setForm((f) => ({ ...f, country: v }))}
              placeholder="Italy"
            />
          </div>

          <button
            disabled={form.display_name.trim().length < 2 || createMut.isPending}
            onClick={() => createMut.mutate()}
            className="w-full py-3 mono-tag mt-2"
            style={{
              background: "var(--color-obsidian)",
              color: "var(--color-neon)",
              borderRadius: 8,
              opacity: form.display_name.trim().length < 2 ? 0.5 : 1,
            }}
          >
            {createMut.isPending ? "SAVING…" : "CONTINUE → MEDIA"}
          </button>
        </section>
      )}

      {step === "media" && entryId && (
        <MediaStep
          entryId={entryId}
          mediaQ={mediaQ}
          uploading={uploading}
          onUpload={uploadFile}
          onNext={() => setStep("review")}
        />
      )}

      {step === "review" && entryId && (
        <section className="px-5 mt-6 space-y-3">
          <div className="surface-1 lift-1 p-4" style={{ borderRadius: 10 }}>
            <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
              READY TO JUDGE
            </p>
            <p className="mt-2 text-[13px]" style={{ color: "var(--color-ink)" }}>
              Once submitted, your entry is locked and sent to the AI panel. Scoring typically
              completes within a few minutes. Results appear when the event is published.
            </p>
          </div>
          <button
            onClick={() => submitMut.mutate()}
            disabled={submitMut.isPending}
            className="w-full py-3 mono-tag"
            style={{
              background: "var(--color-neon)",
              color: "var(--color-obsidian)",
              borderRadius: 8,
            }}
          >
            {submitMut.isPending ? "SUBMITTING…" : "SUBMIT FOR AI JUDGING →"}
          </button>
          <button
            onClick={() => setStep("media")}
            className="w-full py-2 mono-tag"
            style={{ color: "var(--color-silver)" }}
          >
            ← BACK
          </button>
        </section>
      )}
    </div>
  );
}

function MediaStep({
  entryId,
  mediaQ,
  uploading,
  onUpload,
  onNext,
}: {
  entryId: string;
  mediaQ: any;
  uploading: Kind | null;
  onUpload: (k: Kind, f: File) => void;
  onNext: () => void;
}) {
  const { data } = useSuspenseQuery(mediaQ) as {
    data: { media: any[]; urls: Record<string, string> };
  };
  const media = data.media;
  const countBy = (k: Kind) => media.filter((m: any) => m.kind === k).length;
  const totalPhotos = media.filter((m: any) => (m.kind ?? "").startsWith("photo_")).length;
  const canProceed = totalPhotos >= 3;

  return (
    <section className="px-5 mt-6 space-y-3">
      <p className="text-[12px]" style={{ color: "var(--color-silver)" }}>
        Minimum: 3 exterior photos. Add engine & audio for full scoring.
      </p>
      {MEDIA_SLOTS.map((slot) => (
        <div key={slot.kind} className="surface-1 lift-1 p-4" style={{ borderRadius: 10 }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="serif text-[15px]" style={{ color: "var(--color-ink)" }}>
                {slot.label}
              </p>
              <p className="mono-tag mt-0.5" style={{ color: "var(--color-silver)", fontSize: 10 }}>
                {slot.hint}
              </p>
            </div>
            <span
              className="mono-tag"
              style={{ color: countBy(slot.kind) ? "var(--color-neon)" : "var(--color-silver)" }}
            >
              {countBy(slot.kind)}
            </span>
          </div>
          <label
            className="tap mt-3 block w-full text-center py-2 mono-tag cursor-pointer"
            style={{
              border: "1px dashed var(--color-hair-strong)",
              color: "var(--color-ink)",
              borderRadius: 8,
            }}
          >
            {uploading === slot.kind ? "UPLOADING…" : "+ ADD FILE"}
            <input
              type="file"
              accept={slot.accept}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(slot.kind, f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      ))}
      <button
        disabled={!canProceed}
        onClick={onNext}
        className="w-full py-3 mono-tag mt-2"
        style={{
          background: "var(--color-obsidian)",
          color: "var(--color-neon)",
          borderRadius: 8,
          opacity: canProceed ? 1 : 0.5,
        }}
      >
        CONTINUE → REVIEW
      </button>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <p className="mono-tag mb-1" style={{ color: "var(--color-silver)" }}>
        {label.toUpperCase()}
      </p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
