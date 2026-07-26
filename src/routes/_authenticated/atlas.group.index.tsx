/**
 * Group Ride hub — start a new live ride, join one by code, or resume active ones.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Users, Plus, LogIn, Radio } from "lucide-react";
import { toast } from "sonner";
import { createGroupRide, joinGroupRide, listMyGroupRides } from "@/lib/group-rides.functions";
import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/_authenticated/atlas/group/")({
  head: () => ({
    meta: [
      { title: "Group Rides · ZOMBIEREX" },
      { name: "description", content: "Start or join a live group ride and see everyone's position on the map in real time." },
    ],
  }),
  component: GroupHub,
});

function GroupHub() {
  const nav = useNavigate();
  const create = useServerFn(createGroupRide);
  const join = useServerFn(joinGroupRide);
  const listFn = useServerFn(listMyGroupRides);
  const [title, setTitle] = useState("Sunday Ride");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const mine = useQuery({ queryKey: ["group-rides", "mine"], queryFn: () => listFn({}) });

  async function onCreate() {
    setBusy(true);
    try {
      const r = await create({ data: { title } });
      nav({ to: "/atlas/group/$id", params: { id: r.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Could not create ride");
    } finally {
      setBusy(false);
    }
  }

  async function onJoin() {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const r = await join({ data: { code: code.trim() } });
      nav({ to: "/atlas/group/$id", params: { id: r.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Ride not found");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PullToRefresh onRefresh={() => mine.refetch()}>
    <div className="min-h-svh pb-24">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link to="/atlas" className="tap grid h-9 w-9 place-items-center rounded-full bg-paper-2">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>Group Rides</h1>
          <p className="text-xs text-ink-3">Ride together, see each other live.</p>
        </div>
      </header>

      {/* CREATE */}
      <section className="px-4 pt-5">
        <div className="rounded-2xl border border-line bg-paper-0 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Plus size={16} className="text-neon-deep" />
            <span className="mono-caps text-[10px] font-bold tracking-wider text-ink-3">START A NEW RIDE</span>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ride title"
            className="w-full rounded-xl border border-line bg-paper-1 px-3 py-3 text-sm"
            style={{ color: "var(--color-ink-0)" }}
          />
          <button
            onClick={onCreate}
            disabled={busy}
            className="tap mt-3 w-full rounded-xl py-3 text-sm font-bold"
            style={{ background: "var(--color-neon)", color: "var(--color-obsidian)" }}
          >
            {busy ? "Starting…" : "Start ride & get code"}
          </button>
        </div>
      </section>

      {/* JOIN */}
      <section className="px-4 pt-4">
        <div className="rounded-2xl border border-line bg-paper-0 p-4">
          <div className="mb-2 flex items-center gap-2">
            <LogIn size={16} className="text-ink-2" />
            <span className="mono-caps text-[10px] font-bold tracking-wider text-ink-3">JOIN WITH A CODE</span>
          </div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={8}
            className="w-full rounded-xl border border-line bg-paper-1 px-3 py-3 text-center text-lg font-bold tracking-[0.4em]"
            style={{ color: "var(--color-ink-0)", fontFamily: "var(--font-mono)" }}
          />
          <button
            onClick={onJoin}
            disabled={busy || !code.trim()}
            className="tap mt-3 w-full rounded-xl border border-line bg-paper-2 py-3 text-sm font-bold"
            style={{ color: "var(--color-ink-0)" }}
          >
            {busy ? "Joining…" : "Join ride"}
          </button>
        </div>
      </section>

      {/* MY RIDES */}
      <section className="px-4 pt-6">
        <div className="mb-2 flex items-center gap-2">
          <Users size={14} className="text-ink-3" />
          <span className="mono-caps text-[10px] font-bold tracking-wider text-ink-3">MY GROUP RIDES</span>
        </div>
        {mine.data && mine.data.length > 0 ? (
          <ul className="space-y-2">
            {mine.data.map((r: any) => (
              <li key={r.id}>
                <Link
                  to="/atlas/group/$id"
                  params={{ id: r.id }}
                  className="tap flex items-center justify-between rounded-xl border border-line bg-paper-0 p-3"
                >
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--color-ink-0)" }}>{r.title}</div>
                    <div className="text-[11px] text-ink-3">
                      <span style={{ fontFamily: "var(--font-mono)" }}>{r.join_code}</span> · {r.status}
                    </div>
                  </div>
                  {r.status === "active" ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: "color-mix(in oklab, var(--color-neon) 18%, transparent)", color: "var(--color-neon-deep)" }}>
                      <Radio size={10} /> LIVE
                    </span>
                  ) : (
                    <span className="text-[10px] text-ink-4">ended</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-3">No rides yet. Start one above and share the code with friends.</p>
        )}
      </section>
    </div>
  );
}
