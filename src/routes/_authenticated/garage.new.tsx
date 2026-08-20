import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createVehicle } from "@/lib/garage.functions";
import { VEHICLE_KINDS } from "@/lib/garage.schemas";

export const Route = createFileRoute("/_authenticated/garage/new")({
  head: () => ({
    meta: [
      { title: "Add vehicle · ZOMBIEREX" },
      { name: "description", content: "Add a bike or car to your ZOMBIEREX digital garage." },
      { property: "og:title", content: "Add vehicle · ZOMBIEREX" },
      { property: "og:description", content: "Register a new build in your digital garage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewVehiclePage,
});

const field: React.CSSProperties = {
  background: "var(--color-paper-0)",
  border: "1px solid var(--color-line)",
  color: "var(--color-ink-0)",
};

function NewVehiclePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createVehicle);

  const [kind, setKind] = useState<(typeof VEHICLE_KINDS)[number]>("motorcycle");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [nickname, setNickname] = useState("");
  const [hero, setHero] = useState("");

  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          kind,
          make: make.trim(),
          model: model.trim(),
          year: year ? Number(year) : null,
          nickname: nickname.trim() || null,
          hero_image_url: hero.trim() || null,
        },
      }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["garage"] });
      navigate({ to: "/garage/$id", params: { id: row.id } });
    },
  });

  const valid = make.trim().length > 0 && model.trim().length > 0;

  return (
    <div className="pb-24" style={{ background: "var(--color-paper-1)" }}>
      <header className="px-4 pt-4">
        <Link to="/garage" className="mono-tag" style={{ color: "var(--color-ink-3)" }}>
          ← Garage
        </Link>
        <h1 className="serif mt-2 text-3xl" style={{ color: "var(--color-ink-0)" }}>
          Add vehicle
        </h1>
      </header>

      <form
        className="mt-5 space-y-3 px-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) m.mutate();
        }}
      >
        <label className="block">
          <span className="mono-tag text-[10px]" style={{ color: "var(--color-ink-3)" }}>
            TYPE
          </span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="mt-1 w-full rounded-lg px-3 py-2 text-[14px]"
            style={field}
          >
            {VEHICLE_KINDS.map((k) => (
              <option key={k} value={k}>
                {k[0].toUpperCase() + k.slice(1)}
              </option>
            ))}
          </select>
        </label>

        {[
          { label: "MAKE", value: make, set: setMake, ph: "Yamaha" },
          { label: "MODEL", value: model, set: setModel, ph: "MT-09" },
          { label: "YEAR", value: year, set: setYear, ph: "2023" },
          { label: "NICKNAME", value: nickname, set: setNickname, ph: "Optional" },
          { label: "HERO IMAGE URL", value: hero, set: setHero, ph: "https://…" },
        ].map((f) => (
          <label key={f.label} className="block">
            <span className="mono-tag text-[10px]" style={{ color: "var(--color-ink-3)" }}>
              {f.label}
            </span>
            <input
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.ph}
              inputMode={f.label === "YEAR" ? "numeric" : undefined}
              className="mt-1 w-full rounded-lg px-3 py-2 text-[14px]"
              style={field}
            />
          </label>
        ))}

        {m.isError && (
          <p className="text-[12px]" style={{ color: "#ff6b6b" }}>
            {(m.error as Error).message}
          </p>
        )}

        <button
          type="submit"
          disabled={!valid || m.isPending}
          className="tap w-full rounded-lg py-3 text-[14px] font-semibold disabled:opacity-40"
          style={{ background: "var(--color-ink-0)", color: "var(--color-paper-0)" }}
        >
          {m.isPending ? "Saving…" : "Save vehicle"}
        </button>
      </form>
    </div>
  );
}
