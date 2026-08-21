import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPublicVehicle } from "@/lib/garage-public.functions";

export const Route = createFileRoute("/v/$id")({
  loader: async ({ params }) => {
    const res = await getPublicVehicle({ data: { id: params.id } });
    if (!res) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const v = loaderData?.vehicle;
    if (!v) return { meta: [{ title: "Vehicle · ZOMBIEREX" }] };
    const name =
      v.nickname || [v.year, v.make, v.model].filter(Boolean).join(" ") || "Build";
    const title = `${name} · ZOMBIEREX Garage`;
    const description = `${[v.year, v.make, v.model].filter(Boolean).join(" ")} — build spec sheet, modifications and verified history on ZOMBIEREX.`;
    const img =
      typeof v.hero_image_url === "string" && v.hero_image_url.startsWith("https://")
        ? v.hero_image_url
        : null;
    return {
      meta: [
        { title },
        { name: "description", content: description.slice(0, 155) },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: description.slice(0, 155) },
        { name: "twitter:card", content: img ? "summary_large_image" : "summary" },
        ...(img
          ? [
              { property: "og:image", content: img },
              { name: "twitter:image", content: img },
            ]
          : []),
      ],
    };
  },
  errorComponent: () => (
    <Shell>
      <p className="mono-tag" style={{ color: "var(--color-heat)" }}>
        ERR · LOAD FAILED
      </p>
      <p className="mt-2 text-[13px]" style={{ color: "var(--color-silver)" }}>
        This build could not be loaded right now.
      </p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
        404 · NOT FOUND
      </p>
      <p className="mt-2 text-[13px]" style={{ color: "var(--color-silver)" }}>
        This vehicle is not public.
      </p>
    </Shell>
  ),
  component: PublicVehicle,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pt-20 pb-24 text-center">
      {children}
      <Link to="/" className="btn-ghost mt-6 inline-flex">
        Return home
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="flex items-center justify-between border-b py-2"
      style={{ borderColor: "var(--color-hair)" }}
    >
      <span className="mono-tag" style={{ color: "var(--color-titanium)" }}>
        {label}
      </span>
      <span className="text-[13px]" style={{ color: "var(--color-ink)" }}>
        {value}
      </span>
    </div>
  );
}

function PublicVehicle() {
  const { vehicle, owner, mods, judge_score } = Route.useLoaderData();
  const title =
    vehicle.nickname || [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  const spec = (vehicle.spec ?? {}) as Record<string, string | number>;

  return (
    <div className="pb-24">
      {vehicle.hero_image_url ? (
        <img
          src={vehicle.hero_image_url}
          alt={`${title} — ZOMBIEREX build`}
          loading="lazy"
          className="h-56 w-full object-cover"
        />
      ) : (
        <div
          className="h-32 w-full"
          style={{ background: "var(--color-graphite)", borderBottom: "1px solid var(--color-hair)" }}
        />
      )}

      <header className="px-5 pt-5">
        <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
          DIGITAL GARAGE · {String(vehicle.kind).toUpperCase()}
        </p>
        <h1 className="serif mt-2 text-4xl italic" style={{ color: "var(--color-ink)" }}>
          {title}
        </h1>
        {owner && (
          <Link
            to="/u/$handle"
            params={{ handle: owner.handle ?? "" }}
            className="mono-tag mt-2 inline-flex items-center gap-2"
            style={{ color: "var(--color-neon)" }}
          >
            {owner.avatar_url && (
              <img src={owner.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
            )}
            {owner.display_name || owner.handle || "Rider"} →
          </Link>
        )}
        {judge_score != null && (
          <p className="mono-tag mt-3" style={{ color: "var(--color-neon)" }}>
            ◈ AI JUDGE VERIFIED · {judge_score.toFixed(1)}
          </p>
        )}
      </header>

      <section className="mx-5 mt-6">
        <p className="mono-tag mb-1" style={{ color: "var(--color-silver)" }}>
          SPEC SHEET
        </p>
        {vehicle.make && <Row label="MAKE" value={vehicle.make} />}
        {vehicle.model && <Row label="MODEL" value={vehicle.model} />}
        {vehicle.year != null && <Row label="YEAR" value={vehicle.year} />}
        {vehicle.odometer_km != null && (
          <Row label="ODOMETER" value={`${Math.round(Number(vehicle.odometer_km))} km`} />
        )}
        {Object.entries(spec).map(([k, v]) => (
          <Row key={k} label={k.replace(/_/g, " ").toUpperCase()} value={String(v)} />
        ))}
      </section>

      <section className="mx-5 mt-8">
        <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
          MODIFICATIONS · {mods.length}
        </p>
        {mods.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
            No modifications logged.
          </p>
        ) : (
          <ul className="space-y-2">
            {mods.map((m) => (
              <li
                key={m.id}
                className="border p-3"
                style={{
                  borderColor: "var(--color-hair-strong)",
                  background: "var(--color-graphite)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>
                    {m.title}
                  </p>
                  <span className="mono-tag" style={{ color: "var(--color-titanium)" }}>
                    {String(m.category).toUpperCase()}
                  </span>
                </div>
                {m.brand && (
                  <p className="mono-tag mt-1" style={{ color: "var(--color-silver)" }}>
                    {m.brand}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="px-5 pt-10 text-center">
        <Link to="/" className="btn-neon inline-block" style={{ padding: "12px 18px", fontSize: 11 }}>
          BUILD YOUR GARAGE ▸
        </Link>
      </div>
    </div>
  );
}
