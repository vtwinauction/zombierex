import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { commandListUsers } from "@/lib/command.functions";
import { Empty, Panel, Pill, Table, Td, inputStyle, num, when } from "@/components/command/ui";

export const Route = createFileRoute("/_authenticated/owner/command/users")({
  head: () => ({
    meta: [
      { title: "Users · Mission Control · ZOMBIEREX" },
      { name: "description", content: "Search, filter, inspect, block and unblock ZOMBIEREX accounts." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Users · Mission Control" },
      { property: "og:description", content: "ZOMBIEREX user administration." },
    ],
  }),
  component: UsersPage,
});

const FILTERS = ["all", "active", "suspended", "verified", "business", "premium"] as const;

function UsersPage() {
  const fn = useServerFn(commandListUsers);
  const [term, setTerm] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("all");

  const res = useQuery({
    queryKey: ["command", "users", q, status],
    queryFn: () => fn({ data: { q: q || undefined, status, limit: 100, offset: 0 } }),
    retry: false,
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ USERS</p>
        <h1 className="text-2xl font-semibold">Account management</h1>
      </div>

      <Panel>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(term.trim());
          }}
        >
          <input style={inputStyle} placeholder="Search handle or name…" value={term} onChange={(e) => setTerm(e.target.value)} />
          <button className="btn-solid whitespace-nowrap" type="submit">Search</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              className="chip"
              onClick={() => setStatus(f)}
              style={{
                background: status === f ? "rgba(0,200,83,0.14)" : "transparent",
                color: status === f ? "var(--color-neon)" : "var(--color-silver)",
                borderColor: "var(--color-hair-strong)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </Panel>

      <Panel tag="DIRECTORY" title={res.data ? `${num(res.data.total)} accounts` : "Loading…"}>
        {res.isLoading && <p className="text-sm opacity-60">Loading…</p>}
        {res.error && <p className="text-sm" style={{ color: "var(--color-heat)" }}>{String((res.error as Error).message)}</p>}
        {res.data && (res.data.rows.length === 0 ? <Empty /> : (
          <Table head={["User", "Status", "Tier", "Posts", "Listings", "Joined", ""]}>
            {res.data.rows.map((u: any) => (
              <tr key={u.id}>
                <Td>
                  <div className="flex min-w-0 items-center gap-2">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-7 w-7 rounded-full" style={{ background: "rgba(0,0,0,0.08)" }} />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[13px]">{u.display_name ?? "—"}</p>
                      <p className="mono-tag truncate text-[10px]" style={{ color: "var(--color-silver)" }}>@{u.handle}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <Pill tone={u.is_suspended ? "bad" : "ok"}>{u.is_suspended ? "BLOCKED" : "ACTIVE"}</Pill>
                    {u.is_verified && <Pill tone="ok">VERIFIED</Pill>}
                    {u.is_business && <Pill>BUSINESS</Pill>}
                    {u.is_premium && <Pill tone="warn">PREMIUM</Pill>}
                  </div>
                </Td>
                <Td><span className="mono-tag text-[10px]">{u.tier ?? "—"} · L{u.level ?? 0}</span></Td>
                <Td>{num(u.posts_count)}</Td>
                <Td>{num(u.listings_count)}</Td>
                <Td><span className="text-[11px]" style={{ color: "var(--color-silver)" }}>{when(u.created_at)}</span></Td>
                <Td>
                  <Link to="/owner/command/users/$id" params={{ id: u.id }} className="btn-ghost whitespace-nowrap text-xs">
                    Manage →
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        ))}
      </Panel>
    </div>
  );
}
