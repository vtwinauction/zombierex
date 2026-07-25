import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyRoutes, listSavedRoutes } from "@/lib/routes.functions";
import { RouteCard } from "@/components/RouteCard";
import { useState } from "react";

const mineQuery = queryOptions({
  queryKey: ["atlas", "mine"],
  queryFn: () => listMyRoutes(),
});
const savedQuery = queryOptions({
  queryKey: ["atlas", "saved"],
  queryFn: () => listSavedRoutes(),
});

export const Route = createFileRoute("/_authenticated/atlas/mine")({
  head: () => ({ meta: [
    { title: "My Routes · ZOMBIEREX Atlas" },
    { name: "description", content: "Routes you've created and saved for future rides." },
    { property: "og:title", content: "My Routes · ZOMBIEREX Atlas" },
    { property: "og:description", content: "Routes you've created and saved for future rides." },
  ] }),
  component: MinePage,
});

function MinePage() {
  const [tab, setTab] = useState<"mine"|"saved">("mine");
  return (
    <div className="min-h-svh pb-24">
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <Tab label="CREATED" active={tab==="mine"} onClick={() => setTab("mine")} />
          <Tab label="SAVED" active={tab==="saved"} onClick={() => setTab("saved")} />
          <Link to="/atlas/new" className="ml-auto tap mono-caps text-[10px] font-bold" style={{ padding: "6px 10px", background: "var(--color-neon)", color: "var(--color-obsidian)" }}>+ NEW</Link>
        </div>
        <div className="mt-4">{tab === "mine" ? <MineList /> : <SavedList />}</div>
      </div>
    </div>
  );
}

function MineList() {
  const { data } = useSuspenseQuery(mineQuery);
  if (!data.length) return <Empty text="You haven't planned any routes yet." />;
  return <div className="grid gap-3">{data.map((r: any) => <RouteCard key={r.id} route={r} />)}</div>;
}
function SavedList() {
  const { data } = useSuspenseQuery(savedQuery);
  if (!data.length) return <Empty text="No saved routes yet." />;
  return <div className="grid gap-3">{data.map((r: any) => <RouteCard key={r.id} route={r} />)}</div>;
}
function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm" style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink-3)" }}>{text}</div>;
}
function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="tap mono-caps text-[10px] font-bold px-3 py-2"
      style={{
        background: active ? "var(--color-neon)" : "transparent",
        color: active ? "var(--color-obsidian)" : "var(--color-titanium)",
        border: "1px solid " + (active ? "var(--color-neon)" : "var(--color-hair-strong)"),
      }}
    >{label}</button>
  );
}
