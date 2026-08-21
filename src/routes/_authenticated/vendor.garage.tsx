import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  deleteGarageService,
  getMyGarage,
  updateMyGarageBusiness,
  upsertGarageService,
} from "@/lib/garages.functions";
import {
  DAY_KEYS,
  DEFAULT_AVAILABILITY,
  GARAGE_SPECIALTIES,
  GARAGE_VEHICLE_TYPES,
  PAYMENT_METHODS,
  type DayWindow,
} from "@/lib/garage-taxonomy";

export const Route = createFileRoute("/_authenticated/vendor/garage")({
  head: () => ({
    meta: [
      { title: "Garage Settings · ZOMBIEREX" },
      { name: "description", content: "Configure your workshop profile, specialties, price list and booking hours." },
      { property: "og:title", content: "Garage Settings · ZOMBIEREX" },
      { property: "og:description", content: "Workshop profile, specialties, price list and booking hours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GarageSettings,
});

function minorFactor(currency: string) {
  return ["BHD", "KWD", "OMR"].includes(currency) ? 1000 : 100;
}

function GarageSettings() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMyGarage);
  const saveFn = useServerFn(updateMyGarageBusiness);
  const serviceFn = useServerFn(upsertGarageService);
  const delFn = useServerFn(deleteGarageService);

  const { data, isLoading } = useQuery({ queryKey: ["vendor", "garage"], queryFn: () => getFn(), retry: false });
  const vendor = (data as any)?.vendor;
  const services = ((data as any)?.services ?? []) as any[];
  const subscription = (data as any)?.subscription;

  const [specialties, setSpecialties] = useState<string[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [brands, setBrands] = useState("");
  const [emergency, setEmergency] = useState(false);
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [payments, setPayments] = useState<string[]>([]);
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [days, setDays] = useState<Record<string, DayWindow>>(DEFAULT_AVAILABILITY.days as never);

  useEffect(() => {
    if (!vendor) return;
    setSpecialties(vendor.specialties ?? []);
    setVehicleTypes(vendor.vehicle_types ?? []);
    setBrands((vendor.brands ?? []).join(", "));
    setEmergency(Boolean(vendor.emergency_service));
    setBookingEnabled(vendor.booking_enabled !== false);
    setPayments(vendor.payment_methods ?? []);
    setSlotMinutes(vendor.availability?.slot_minutes ?? 60);
    setDays({ ...(DEFAULT_AVAILABILITY.days as never), ...(vendor.availability?.days ?? {}) });
  }, [vendor]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          specialties,
          vehicle_types: vehicleTypes,
          brands: brands.split(",").map((b) => b.trim()).filter(Boolean).slice(0, 60),
          emergency_service: emergency,
          booking_enabled: bookingEnabled,
          payment_methods: payments,
          availability: { slot_minutes: slotMinutes, days },
        },
      }),
    onSuccess: () => {
      toast.success("Garage profile updated");
      qc.invalidateQueries({ queryKey: ["vendor", "garage"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="m-4 h-40 animate-pulse" style={{ background: "var(--color-line)" }} />;

  if (!vendor)
    return (
      <div className="px-4 py-16 text-center">
        <p className="serif text-2xl italic">No business profile yet</p>
        <p className="mt-2 text-sm opacity-70">Register your workshop to receive service bookings.</p>
        <Link to="/business" className="btn-neon mt-4 inline-block px-5 py-2">
          APPLY AS A GARAGE
        </Link>
      </div>
    );

  const currency = vendor.currency ?? "BHD";

  return (
    <div className="px-4 pb-28 pt-6">
      <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
        GARAGE OPERATIONS
      </p>
      <h1 className="serif mt-2 text-4xl italic">{vendor.business_name}</h1>
      <div className="mt-2 flex gap-3">
        {vendor.slug && (
          <Link to="/w/$slug" params={{ slug: vendor.slug }} className="mono-tag underline">
            PUBLIC PROFILE →
          </Link>
        )}
        <Link to="/vendor/bookings" className="mono-tag underline">
          BOOKINGS →
        </Link>
      </div>

      <Section title={`Plan · ${subscription?.plan?.name ?? "Free"}`}>
        <p className="text-sm opacity-75">
          {subscription
            ? `${subscription.status.toUpperCase()}${
                subscription.current_period_end
                  ? ` · renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : ""
              }`
            : "You're on the free listing. Upgrade to rank higher in discovery and unlock portfolio, team and analytics."}
        </p>
        <Link to="/business" className="mono-tag mt-2 inline-block underline">
          MANAGE SUBSCRIPTION →
        </Link>
      </Section>

      <Section title="Specialties">
        <ChipGrid
          options={GARAGE_SPECIALTIES.map((s) => ({ code: s.code, label: s.label }))}
          value={specialties}
          onToggle={(c) =>
            setSpecialties((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))
          }
        />
      </Section>

      <Section title="Vehicle types served">
        <ChipGrid
          options={GARAGE_VEHICLE_TYPES.map((s) => ({ code: s.code, label: s.label }))}
          value={vehicleTypes}
          onToggle={(c) =>
            setVehicleTypes((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))
          }
        />
      </Section>

      <Section title="Brands serviced">
        <input
          value={brands}
          onChange={(e) => setBrands(e.target.value)}
          placeholder="Ducati, BMW, Toyota…"
          className="w-full border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-line)", background: "transparent" }}
        />
      </Section>

      <Section title="Payment accepted">
        <ChipGrid
          options={PAYMENT_METHODS.map((m) => ({ code: m, label: m.replace(/_/g, " ") }))}
          value={payments}
          onToggle={(c) => setPayments((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))}
        />
      </Section>

      <Section title="Booking">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={bookingEnabled} onChange={(e) => setBookingEnabled(e.target.checked)} />
          Accept online bookings
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} />
          Offer emergency / roadside assistance
        </label>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="mono-tag text-[10px] opacity-60">SLOT LENGTH</span>
          <select
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(parseInt(e.target.value, 10))}
            className="border px-2 py-1 text-sm"
            style={{ borderColor: "var(--color-line)", background: "transparent" }}
          >
            {[30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="Opening hours">
        <div className="space-y-2">
          {DAY_KEYS.map((d) => {
            const w = days[d] ?? { open: "08:00", close: "18:00" };
            return (
              <div key={d} className="flex items-center gap-2 text-sm">
                <span className="mono-tag w-10 text-[10px] opacity-60">{d.toUpperCase()}</span>
                <input
                  type="time"
                  value={w.open}
                  onChange={(e) => setDays((p) => ({ ...p, [d]: { ...w, open: e.target.value } }))}
                  className="border px-2 py-1"
                  style={{ borderColor: "var(--color-line)", background: "transparent" }}
                />
                <input
                  type="time"
                  value={w.close}
                  onChange={(e) => setDays((p) => ({ ...p, [d]: { ...w, close: e.target.value } }))}
                  className="border px-2 py-1"
                  style={{ borderColor: "var(--color-line)", background: "transparent" }}
                />
                <label className="ml-auto flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(w.closed)}
                    onChange={(e) => setDays((p) => ({ ...p, [d]: { ...w, closed: e.target.checked } }))}
                  />
                  Closed
                </label>
              </div>
            );
          })}
        </div>
      </Section>

      <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-neon mt-6 w-full py-3">
        {save.isPending ? "SAVING…" : "SAVE GARAGE PROFILE"}
      </button>

      <Section title="Price list">
        <ServiceEditor
          currency={currency}
          services={services}
          onSave={async (payload) => {
            await serviceFn({ data: payload as never });
            qc.invalidateQueries({ queryKey: ["vendor", "garage"] });
            toast.success("Service saved");
          }}
          onDelete={async (id) => {
            await delFn({ data: { id } });
            qc.invalidateQueries({ queryKey: ["vendor", "garage"] });
            toast.success("Service removed");
          }}
        />
      </Section>
    </div>
  );
}

function ServiceEditor({
  services,
  currency,
  onSave,
  onDelete,
}: {
  services: any[];
  currency: string;
  onSave: (p: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [minutes, setMinutes] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        price_cents: price ? Math.round(parseFloat(price) * minorFactor(currency)) : null,
        duration_minutes: minutes ? parseInt(minutes, 10) : null,
        is_active: true,
      });
      setName("");
      setPrice("");
      setMinutes("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {services.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-line)" }}
        >
          <span>
            {s.name}
            {s.duration_minutes ? <span className="mono-tag ml-2 text-[10px] opacity-60">{s.duration_minutes}M</span> : null}
          </span>
          <span className="flex items-center gap-3">
            <span className="mono-num">
              {s.price_cents != null
                ? `${currency} ${(s.price_cents / minorFactor(currency)).toFixed(minorFactor(currency) === 1000 ? 3 : 2)}`
                : "Quote"}
            </span>
            <button onClick={() => onDelete(s.id)} className="tap text-xs" style={{ color: "#b0483c" }}>
              Remove
            </button>
          </span>
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Service name"
          className="min-w-[45%] flex-1 border px-2 py-2 text-sm"
          style={{ borderColor: "var(--color-line)", background: "transparent" }}
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputMode="decimal"
          placeholder={`Price (${currency})`}
          className="w-28 border px-2 py-2 text-sm"
          style={{ borderColor: "var(--color-line)", background: "transparent" }}
        />
        <input
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          inputMode="numeric"
          placeholder="Mins"
          className="w-20 border px-2 py-2 text-sm"
          style={{ borderColor: "var(--color-line)", background: "transparent" }}
        />
        <button onClick={add} disabled={busy || !name} className="btn-neon px-4 py-2 text-xs" style={{ opacity: !name ? 0.4 : 1 }}>
          ADD
        </button>
      </div>
    </div>
  );
}

function ChipGrid({
  options,
  value,
  onToggle,
}: {
  options: { code: string; label: string }[];
  value: string[];
  onToggle: (code: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.code);
        return (
          <button
            key={o.code}
            onClick={() => onToggle(o.code)}
            className="tap border px-2.5 py-1.5 text-xs"
            style={{
              borderColor: on ? "var(--color-signal, #00c853)" : "var(--color-line)",
              background: on ? "rgba(0,200,83,0.08)" : "transparent",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border p-4" style={{ borderColor: "var(--color-line)" }}>
      <h2 className="mono-tag mb-3 text-[10px] opacity-60">{title.toUpperCase()}</h2>
      {children}
    </section>
  );
}
