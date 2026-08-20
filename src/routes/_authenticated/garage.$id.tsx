import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getVehicle,
  addMod,
  deleteMod,
  addServiceRecord,
  deleteServiceRecord,
} from "@/lib/garage.functions";
import { MOD_CATEGORIES } from "@/lib/garage.schemas";
import { confirmDialog } from "@/lib/confirm";
import { VehicleIntelligence } from "@/components/VehicleIntelligence";
import { listVehicleRides } from "@/lib/rides.functions";
import { listVehiclePosts } from "@/lib/garage-public.functions";

export const Route = createFileRoute("/_authenticated/garage/$id")({
  head: () => ({
    meta: [
      { title: "Vehicle · ZOMBIEREX Garage" },
      { name: "description", content: "Build sheet, modifications and service history." },
      { property: "og:title", content: "Vehicle · ZOMBIEREX Garage" },
      {
        property: "og:description",
        content: "Build sheet, modifications and service history for this vehicle.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VehiclePage,
});

const field: React.CSSProperties = {
  background: "var(--color-paper-0)",
  border: "1px solid var(--color-line)",
  color: "var(--color-ink-0)",
};

function VehiclePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchVehicle = useServerFn(getVehicle);
  const q = useQuery({
    queryKey: ["garage", "vehicle", id],
    queryFn: () => fetchVehicle({ data: { id } }),
    retry: false,
  });

  if (q.isLoading)
    return (
      <p className="px-4 py-10 mono-tag" style={{ color: "var(--color-ink-3)" }}>
        Loading…
      </p>
    );
  if (q.isError || !q.data)
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-[13px]" style={{ color: "var(--color-ink-3)" }}>
          {(q.error as Error)?.message ?? "Vehicle not found."}
        </p>
        <Link to="/garage" className="mono-tag mt-3 inline-block" style={{ color: "var(--color-neon)" }}>
          ← GARAGE
        </Link>
      </div>
    );

  const { vehicle, isOwner, mods, service } = q.data;
  const invalidate = () => qc.invalidateQueries({ queryKey: ["garage"] });

  return (
    <div className="pb-24" style={{ background: "var(--color-paper-1)" }}>
      <div className="aspect-[16/9] w-full overflow-hidden" style={{ background: "var(--color-paper-2)" }}>
        {vehicle.hero_image_url && (
          <img
            src={vehicle.hero_image_url}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <header className="px-4 pt-4">
        <Link to="/garage" className="mono-tag" style={{ color: "var(--color-ink-3)" }}>
          ← Garage
        </Link>
        <p className="mono-tag mt-2 text-[10px]" style={{ color: "var(--color-ink-3)" }}>
          {String(vehicle.kind).toUpperCase()}
          {vehicle.year ? ` · ${vehicle.year}` : ""}
          {vehicle.is_primary ? " · PRIMARY" : ""}
        </p>
        <h1 className="serif mt-1 text-3xl" style={{ color: "var(--color-ink-0)" }}>
          {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
        </h1>
        {vehicle.nickname && (
          <p className="text-[13px]" style={{ color: "var(--color-ink-3)" }}>
            {vehicle.make} {vehicle.model}
          </p>
        )}
        {isOwner && (
          <Link
            to="/marketplace/new"
            search={{ vehicle: id }}
            className="tap mono-tag mt-3 inline-block rounded-lg px-3 py-2 text-[10px]"
            style={{ background: "var(--color-ink-0)", color: "var(--color-paper-0)" }}
          >
            LIST FOR SALE →
          </Link>
        )}
      </header>

      <ModsSection
        vehicleId={id}
        isOwner={isOwner}
        mods={mods}
        onChanged={invalidate}
      />

      {isOwner && <VehicleIntelligence vehicleId={id} />}

      {isOwner && (
        <VehicleRides vehicleId={id} odometerKm={Number((vehicle as any).odometer_km ?? 0)} />
      )}

      {isOwner && <VehicleJudge vehicleId={id} />}

      <TaggedPosts vehicleId={id} />


      {isOwner && (
        <ServiceSection vehicleId={id} records={service} onChanged={invalidate} />
      )}
    </div>
  );
}

function VehicleRides({ vehicleId, odometerKm }: { vehicleId: string; odometerKm: number }) {
  const fetchRides = useServerFn(listVehicleRides);
  const q = useQuery({
    queryKey: ["garage", "vehicle-rides", vehicleId],
    queryFn: () => fetchRides({ data: { vehicleId } }),
    retry: false,
  });
  const rides = q.data ?? [];

  return (
    <section className="mt-8 px-4">
      <h2 className="mono-tag text-[11px]" style={{ color: "var(--color-ink-1)" }}>
        ODOMETER · RIDE LOG
      </h2>
      <div
        className="mt-3 border p-4"
        style={{ borderColor: "var(--color-hair)", background: "var(--color-paper-2)" }}
      >
        <p className="mono-num text-3xl font-black" style={{ color: "var(--color-ink-0)" }}>
          {odometerKm.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          <span className="mono-tag ml-1 text-[10px]" style={{ color: "var(--color-ink-3)" }}>
            KM TRACKED
          </span>
        </p>
        <p className="mono-tag mt-1 text-[10px]" style={{ color: "var(--color-ink-3)" }}>
          {rides.length ? `${rides.length} LOGGED RIDE${rides.length === 1 ? "" : "S"}` : "NO RIDES LINKED YET"}
        </p>
      </div>
      {rides.length > 0 && (
        <ul className="mt-2 divide-y" style={{ borderColor: "var(--color-hair)" }}>
          {rides.map((r: any) => (
            <li key={r.id} className="py-2">
              <Link
                to="/rides/$id"
                params={{ id: r.id }}
                className="flex items-center justify-between text-[13px]"
                style={{ color: "var(--color-ink-1)" }}
              >
                <span>{r.title || new Date(r.started_at).toLocaleDateString()}</span>
                <span className="mono-num text-[12px]" style={{ color: "var(--color-ink-3)" }}>
                  {(r.distance_m / 1000).toFixed(1)} KM
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TaggedPosts({ vehicleId }: { vehicleId: string }) {
  const fetchPosts = useServerFn(listVehiclePosts);
  const q = useQuery({
    queryKey: ["garage", "vehicle-posts", vehicleId],
    queryFn: () => fetchPosts({ data: { vehicleId } }),
    retry: false,
  });
  const posts = q.data ?? [];
  if (!posts.length) return null;

  return (
    <section className="mt-8 px-4">
      <h2 className="mono-tag text-[11px]" style={{ color: "var(--color-ink-1)" }}>
        TAGGED POSTS · {posts.length}
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-1">
        {posts.map((p) => (
          <Link
            key={p.id}
            to="/p/$id"
            params={{ id: p.id }}
            className="aspect-square overflow-hidden rounded"
            style={{ background: "var(--color-paper-2)" }}
          >
            {(p.thumbnail_url || p.media_url) && (
              <img
                src={p.thumbnail_url || p.media_url!}
                alt={p.caption?.slice(0, 80) ?? "Tagged post"}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

type ModRow = {
  id: string;
  category: string;
  title: string;
  brand: string | null;
  notes: string | null;
  installed_on: string | null;
};

function ModsSection({
  vehicleId,
  isOwner,
  mods,
  onChanged,
}: {
  vehicleId: string;
  isOwner: boolean;
  mods: ModRow[];
  onChanged: () => void;
}) {
  const add = useServerFn(addMod);
  const del = useServerFn(deleteMod);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<(typeof MOD_CATEGORIES)[number]>("other");

  const addM = useMutation({
    mutationFn: () =>
      add({
        data: {
          vehicle_id: vehicleId,
          title: title.trim(),
          brand: brand.trim() || null,
          category,
          currency: "BHD",
        },
      }),
    onSuccess: () => {
      setTitle("");
      setBrand("");
      setOpen(false);
      onChanged();
    },
  });
  const delM = useMutation({
    mutationFn: (mid: string) => del({ data: { id: mid } }),
    onSuccess: onChanged,
  });

  return (
    <section className="mt-6 px-4">
      <div className="flex items-center justify-between">
        <h2 className="mono-tag text-[11px]" style={{ color: "var(--color-ink-1)" }}>
          MODIFICATIONS · {mods.length}
        </h2>
        {isOwner && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="mono-tag text-[10px]"
            style={{ color: "var(--color-neon)" }}
          >
            {open ? "CANCEL" : "+ ADD MOD"}
          </button>
        )}
      </div>

      {open && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) addM.mutate();
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Akrapovič full system"
            className="w-full rounded-lg px-3 py-2 text-[14px]"
            style={field}
          />
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Brand (optional)"
            className="w-full rounded-lg px-3 py-2 text-[14px]"
            style={field}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="w-full rounded-lg px-3 py-2 text-[14px]"
            style={field}
          >
            {MOD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!title.trim() || addM.isPending}
            className="tap w-full rounded-lg py-2 text-[13px] font-semibold disabled:opacity-40"
            style={{ background: "var(--color-ink-0)", color: "var(--color-paper-0)" }}
          >
            {addM.isPending ? "Saving…" : "Add mod"}
          </button>
        </form>
      )}

      <ul className="mt-3 space-y-2">
        {mods.length === 0 && (
          <li className="text-[13px]" style={{ color: "var(--color-ink-3)" }}>
            No modifications logged yet.
          </li>
        )}
        {mods.map((m) => (
          <li
            key={m.id}
            className="flex items-start justify-between gap-3 rounded-xl p-3"
            style={{ background: "var(--color-paper-0)", border: "1px solid var(--color-line)" }}
          >
            <div className="min-w-0">
              <p className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>
                {m.category.toUpperCase()}
              </p>
              <p className="text-[14px] font-semibold" style={{ color: "var(--color-ink-0)" }}>
                {m.title}
              </p>
              {m.brand && (
                <p className="text-[12px]" style={{ color: "var(--color-ink-3)" }}>
                  {m.brand}
                </p>
              )}
            </div>
            {isOwner && (
              <button
                onClick={() => delM.mutate(m.id)}
                className="mono-tag text-[10px]"
                style={{ color: "#ff6b6b" }}
              >
                REMOVE
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

type ServiceRow = {
  id: string;
  title: string;
  shop: string | null;
  odometer_km: number | null;
  service_date: string;
  status: string;
};

function ServiceSection({
  vehicleId,
  records,
  onChanged,
}: {
  vehicleId: string;
  records: ServiceRow[];
  onChanged: () => void;
}) {
  const add = useServerFn(addServiceRecord);
  const del = useServerFn(deleteServiceRecord);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [shop, setShop] = useState("");
  const [odo, setOdo] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [dueOdo, setDueOdo] = useState("");

  const addM = useMutation({
    mutationFn: () =>
      add({
        data: {
          vehicle_id: vehicleId,
          title: title.trim(),
          shop: shop.trim() || null,
          odometer_km: odo ? Number(odo) : null,
          service_date: date,
          due_date: dueDate || null,
          due_odometer_km: dueOdo ? Number(dueOdo) : null,
          status: "done" as const,
          currency: "BHD",
        },
      }),
    onSuccess: () => {
      setTitle("");
      setShop("");
      setOdo("");
      setDueDate("");
      setDueOdo("");
      setOpen(false);
      onChanged();
    },
  });
  const delM = useMutation({
    mutationFn: (sid: string) => del({ data: { id: sid } }),
    onSuccess: onChanged,
  });

  return (
    <section className="mt-8 px-4">
      <div className="flex items-center justify-between">
        <h2 className="mono-tag text-[11px]" style={{ color: "var(--color-ink-1)" }}>
          SERVICE HISTORY · {records.length}
        </h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="mono-tag text-[10px]"
          style={{ color: "var(--color-neon)" }}
        >
          {open ? "CANCEL" : "+ LOG SERVICE"}
        </button>
      </div>
      <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-3)" }}>
        Private to you.
      </p>

      {open && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) addM.mutate();
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Oil & filter change"
            className="w-full rounded-lg px-3 py-2 text-[14px]"
            style={field}
          />
          <input
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder="Shop (optional)"
            className="w-full rounded-lg px-3 py-2 text-[14px]"
            style={field}
          />
          <input
            value={odo}
            onChange={(e) => setOdo(e.target.value)}
            inputMode="numeric"
            placeholder="Odometer km (optional)"
            className="w-full rounded-lg px-3 py-2 text-[14px]"
            style={field}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-[14px]"
            style={field}
          />
          <p className="mono-tag pt-1 text-[9px]" style={{ color: "var(--color-ink-3)" }}>
            NEXT SERVICE DUE (OPTIONAL)
          </p>
          <div className="flex gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-1/2 rounded-lg px-3 py-2 text-[14px]"
              style={field}
            />
            <input
              value={dueOdo}
              onChange={(e) => setDueOdo(e.target.value)}
              inputMode="numeric"
              placeholder="Due at km"
              className="w-1/2 rounded-lg px-3 py-2 text-[14px]"
              style={field}
            />
          </div>
          <button
            type="submit"
            disabled={!title.trim() || addM.isPending}
            className="tap w-full rounded-lg py-2 text-[13px] font-semibold disabled:opacity-40"
            style={{ background: "var(--color-ink-0)", color: "var(--color-paper-0)" }}
          >
            {addM.isPending ? "Saving…" : "Log service"}
          </button>
        </form>
      )}

      <ol className="mt-3 space-y-2">
        {records.length === 0 && (
          <li className="text-[13px]" style={{ color: "var(--color-ink-3)" }}>
            No service records yet.
          </li>
        )}
        {records.map((r) => (
          <li
            key={r.id}
            className="flex items-start justify-between gap-3 rounded-xl p-3"
            style={{ background: "var(--color-paper-0)", border: "1px solid var(--color-line)" }}
          >
            <div className="min-w-0">
              <p className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>
                {new Date(r.service_date).toLocaleDateString()}
                {r.odometer_km != null ? ` · ${r.odometer_km.toLocaleString()} KM` : ""}
              </p>
              <p className="text-[14px] font-semibold" style={{ color: "var(--color-ink-0)" }}>
                {r.title}
              </p>
              {r.shop && (
                <p className="text-[12px]" style={{ color: "var(--color-ink-3)" }}>
                  {r.shop}
                </p>
              )}
            </div>
            <button
              onClick={async () => {
                if (
                  await confirmDialog({
                    title: "Delete this record?",
                    destructive: true,
                    confirmLabel: "Delete",
                  })
                )
                  delM.mutate(r.id);
              }}
              className="mono-tag text-[10px]"
              style={{ color: "#ff6b6b" }}
            >
              DELETE
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
