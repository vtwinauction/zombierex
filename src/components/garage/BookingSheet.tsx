import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { getGarageAvailability } from "@/lib/garages.functions";
import { createBooking } from "@/lib/bookings.functions";
import { listMyVehicles } from "@/lib/garage.functions";
import { nextDates } from "@/lib/garage-taxonomy";

export type BookingGarage = {
  id: string;
  business_name: string;
  currency?: string | null;
  slug?: string | null;
};

export type BookingService = {
  id: string;
  name: string;
  price_cents?: number | null;
  duration_minutes?: number | null;
};

const STEPS = ["Service", "When", "Details", "Review"] as const;

function money(cents?: number | null, currency = "BHD") {
  if (cents == null) return null;
  const minor = currency === "BHD" || currency === "KWD" || currency === "OMR" ? 1000 : 100;
  return `${currency} ${(cents / minor).toFixed(minor === 1000 ? 3 : 2)}`;
}

export function BookingSheet({
  garage,
  services,
  open,
  onClose,
}: {
  garage: BookingGarage;
  services: BookingService[];
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [date, setDate] = useState(() => nextDates(1)[0]!);
  const [time, setTime] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const [mediaText, setMediaText] = useState("");
  const [quote, setQuote] = useState(false);
  const [phone, setPhone] = useState("");

  const dates = useMemo(() => nextDates(14), []);
  const currency = garage.currency ?? "BHD";

  const availabilityFn = useServerFn(getGarageAvailability);
  const vehiclesFn = useServerFn(listMyVehicles);
  const createFn = useServerFn(createBooking);

  const slots = useQuery({
    queryKey: ["garage-availability", garage.id, date],
    queryFn: () => availabilityFn({ data: { vendor_id: garage.id, date } }),
    enabled: open,
  });

  const vehicles = useQuery({
    queryKey: ["garage", "mine", "booking"],
    queryFn: () => vehiclesFn(),
    enabled: open,
    retry: false,
  });

  useEffect(() => setTime(null), [date]);

  const book = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          vendor_id: garage.id,
          service_ids: selected,
          vehicle_id: vehicleId,
          date,
          time: time!,
          problem_text: problem || undefined,
          media: mediaText
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter((s) => /^https?:\/\//.test(s))
            .slice(0, 8),
          quote_requested: quote,
          contact_phone: phone || undefined,
        },
      }),
    onSuccess: (res: { id: string }) => {
      toast.success("Booking request sent");
      onClose();
      navigate({ to: "/bookings/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message || "Could not create the booking"),
  });

  if (!open) return null;

  const chosenServices = services.filter((s) => selected.includes(s.id));
  const total = chosenServices.reduce((sum, s) => sum + (s.price_cents ?? 0), 0);
  const canNext = step === 0 ? true : step === 1 ? Boolean(time) : true;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        aria-label="Close booking"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
      />
      <div
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden border"
        style={{
          background: "var(--color-bone, #fafafa)",
          borderColor: "var(--color-line)",
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
        }}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--color-line)" }}>
          <div>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
              BOOK A SERVICE
            </p>
            <h2 className="serif text-xl italic">{garage.business_name}</h2>
          </div>
          <button onClick={onClose} className="tap px-2 text-lg" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex gap-1 px-4 pt-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div
                className="h-[3px] w-full"
                style={{ background: i <= step ? "var(--color-signal, #00c853)" : "var(--color-line)" }}
              />
              <p className="mono-tag mt-1 text-[9px]" style={{ opacity: i === step ? 1 : 0.45 }}>
                {s.toUpperCase()}
              </p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {step === 0 && (
            <div className="space-y-2">
              {services.length === 0 && (
                <p className="text-sm opacity-70">
                  This garage hasn’t published a price list. Continue and describe what you need — they’ll
                  send a quotation.
                </p>
              )}
              {services.map((s) => {
                const on = selected.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() =>
                      setSelected((prev) => (on ? prev.filter((x) => x !== s.id) : [...prev, s.id]))
                    }
                    className="tap flex w-full items-center justify-between border px-3 py-3 text-left"
                    style={{
                      borderColor: on ? "var(--color-signal, #00c853)" : "var(--color-line)",
                      background: on ? "rgba(0,200,83,0.06)" : "transparent",
                    }}
                  >
                    <span>
                      <span className="block text-sm font-medium">{s.name}</span>
                      {s.duration_minutes ? (
                        <span className="mono-tag text-[10px] opacity-60">{s.duration_minutes} MIN</span>
                      ) : null}
                    </span>
                    <span className="mono-num text-sm">{money(s.price_cents, currency) ?? "Quote"}</span>
                  </button>
                );
              })}
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={quote} onChange={(e) => setQuote(e.target.checked)} />
                Request a quotation before confirming
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {dates.map((d) => {
                  const dt = new Date(`${d}T00:00:00`);
                  const on = d === date;
                  return (
                    <button
                      key={d}
                      onClick={() => setDate(d)}
                      className="tap shrink-0 border px-3 py-2 text-center"
                      style={{
                        borderColor: on ? "var(--color-signal, #00c853)" : "var(--color-line)",
                        background: on ? "rgba(0,200,83,0.06)" : "transparent",
                      }}
                    >
                      <span className="mono-tag block text-[9px] opacity-60">
                        {dt.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}
                      </span>
                      <span className="mono-num text-sm">{dt.getDate()}</span>
                    </button>
                  );
                })}
              </div>

              {slots.isLoading ? (
                <p className="text-sm opacity-60">Loading slots…</p>
              ) : (slots.data?.slots ?? []).length === 0 ? (
                <p className="text-sm opacity-70">Closed on this day — pick another date.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.data!.slots.map((t) => {
                    const taken = slots.data!.taken.includes(t);
                    const on = time === t;
                    return (
                      <button
                        key={t}
                        disabled={taken}
                        onClick={() => setTime(t)}
                        className="tap border py-2 text-sm"
                        style={{
                          borderColor: on ? "var(--color-signal, #00c853)" : "var(--color-line)",
                          background: on ? "rgba(0,200,83,0.06)" : "transparent",
                          opacity: taken ? 0.3 : 1,
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="mono-tag mb-2 text-[10px] opacity-60">VEHICLE</p>
                <div className="space-y-2">
                  {(vehicles.data ?? []).map((v: any) => {
                    const on = vehicleId === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setVehicleId(on ? null : v.id)}
                        className="tap flex w-full items-center gap-3 border px-3 py-2 text-left"
                        style={{
                          borderColor: on ? "var(--color-signal, #00c853)" : "var(--color-line)",
                          background: on ? "rgba(0,200,83,0.06)" : "transparent",
                        }}
                      >
                        <span className="text-sm">
                          {v.nickname || `${v.make} ${v.model}`}
                          {v.year ? ` · ${v.year}` : ""}
                        </span>
                      </button>
                    );
                  })}
                  {(vehicles.data ?? []).length === 0 && (
                    <p className="text-sm opacity-70">
                      No vehicles in your garage yet — you can still book and describe the vehicle below.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="mono-tag mb-2 text-[10px] opacity-60">WHAT’S THE ISSUE?</p>
                <textarea
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Describe the problem, symptoms or the work you want done…"
                  className="w-full border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--color-line)", background: "transparent" }}
                />
              </div>

              <div>
                <p className="mono-tag mb-2 text-[10px] opacity-60">PHOTO / VIDEO LINKS (OPTIONAL)</p>
                <input
                  value={mediaText}
                  onChange={(e) => setMediaText(e.target.value)}
                  placeholder="https://… (space separated)"
                  className="w-full border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--color-line)", background: "transparent" }}
                />
              </div>

              <div>
                <p className="mono-tag mb-2 text-[10px] opacity-60">CONTACT NUMBER (OPTIONAL)</p>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--color-line)", background: "transparent" }}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <Row label="Garage" value={garage.business_name} />
              <Row
                label="Services"
                value={chosenServices.length ? chosenServices.map((s) => s.name).join(", ") : "Quotation requested"}
              />
              <Row
                label="When"
                value={`${new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })} · ${time ?? "—"}`}
              />
              <Row
                label="Vehicle"
                value={
                  (vehicles.data ?? []).find((v: any) => v.id === vehicleId)
                    ? (() => {
                        const v: any = (vehicles.data ?? []).find((x: any) => x.id === vehicleId);
                        return v.nickname || `${v.make} ${v.model}`;
                      })()
                    : "Not specified"
                }
              />
              <Row label="Notes" value={problem || "—"} />
              <Row
                label="Estimate"
                value={total > 0 ? (money(total, currency) ?? "—") : quote ? "Quotation on request" : "—"}
              />
              <p className="pt-2 text-xs opacity-60">
                The garage confirms availability and price. You’ll get a notification on every status change.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t px-4 py-3" style={{ borderColor: "var(--color-line)" }}>
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} className="tap border px-4 py-3 text-sm" style={{ borderColor: "var(--color-line)" }}>
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="btn-neon flex-1 py-3 text-center"
              style={{ opacity: canNext ? 1 : 0.4 }}
            >
              CONTINUE
            </button>
          ) : (
            <button
              disabled={book.isPending || !time}
              onClick={() => book.mutate()}
              className="btn-neon flex-1 py-3 text-center"
              style={{ opacity: book.isPending || !time ? 0.5 : 1 }}
            >
              {book.isPending ? "SENDING…" : "CONFIRM BOOKING"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-2" style={{ borderColor: "var(--color-line)" }}>
      <span className="mono-tag text-[10px] opacity-60">{label.toUpperCase()}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
