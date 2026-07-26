import { createFileRoute } from "@tanstack/react-router";
import { users } from "@/lib/mock-data";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Log · ZOMBIEREX" }, { name: "description", content: "System log of activity across your ZOMBIEREX network." }] }),
  component: NotificationsPage,
});

const items = [
  { id: "n1", kind: "LIKE", user: users[1], text: "liked your night ride reel", time: "00:02", tone: "var(--color-heat)" },
  { id: "n2", kind: "FLW",  user: users[0], text: "started following you", time: "00:18", tone: "var(--color-cool)" },
  { id: "n3", kind: "CMT",  user: users[2], text: "commented: “That Akra sounds sick.”", time: "01:00", tone: "var(--color-ink)" },
  { id: "n4", kind: "TRPY", user: users[0], text: "You earned Canyon Carver", time: "03:00", tone: "var(--color-signal)" },
  { id: "n5", kind: "WRKS", user: users[2], text: "Valve check due at 20,000 mi", time: "24:00", tone: "var(--color-plum)" },
] as const;

function NotificationsPage() {
  const qc = useQueryClient();
  return (
    <PullToRefresh onRefresh={async () => { await qc.invalidateQueries({ queryKey: ["notifications"] }); }}>
    <div>

      <div className="flex items-end justify-between px-4 pt-6">
        <div>
          <p className="mono-tag">SIGNALS · LAST 24H</p>
          <h1 className="mt-2 display-xl text-5xl uppercase">Log</h1>
        </div>
        <button className="mono-tag" style={{ color: "var(--color-ash)" }}>MARK ALL READ</button>
      </div>

      {/* Table-like header */}
      <div className="mt-6 grid grid-cols-[52px_60px_1fr_auto] gap-3 px-4 py-2 hairline-t hairline-b" style={{ background: "var(--color-mist)" }}>
        <span className="mono-tag" style={{ color: "var(--color-ash)" }}>T-MINUS</span>
        <span className="mono-tag" style={{ color: "var(--color-ash)" }}>TYPE</span>
        <span className="mono-tag" style={{ color: "var(--color-ash)" }}>EVENT</span>
        <span className="mono-tag" style={{ color: "var(--color-ash)" }}>ACT</span>
      </div>

      <ul className="divide-y divide-hair hairline-b">
        {items.map((n) => (
          <li key={n.id} className="grid grid-cols-[52px_60px_1fr_auto] items-center gap-3 px-4 py-4">
            <span className="mono-num text-xs" style={{ color: "var(--color-ash)" }}>-{n.time}</span>
            <span
              className="mono-tag inline-block px-1.5 py-1"
              style={{ background: n.tone, color: "var(--color-bone)" }}
            >
              {n.kind}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <img src={n.user.avatar} alt="" className="h-8 w-8 shrink-0 object-cover hairline" />
              <p className="min-w-0 truncate text-[13px]">
                <span className="font-bold">{n.user.name}</span>{" "}
                <span style={{ color: "var(--color-ash)" }}>{n.text}</span>
              </p>
            </div>
            {n.kind === "FLW" ? (
              <button className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10 }}>FOLLOW BACK</button>
            ) : (
              <span className="mono-tag" style={{ color: "var(--color-ash)" }}>OPEN →</span>
            )}
          </li>
        ))}
      </ul>

      <div className="px-4 py-8 text-center">
        <p className="mono-tag" style={{ color: "var(--color-ash)" }}>END OF LOG</p>
      </div>
    </div>
    </PullToRefresh>
  );
}
