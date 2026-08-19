import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { commandSearch } from "@/lib/command.functions";
import { Empty, Panel, Pill, money, inputStyle, statusTone } from "@/components/command/ui";

export const Route = createFileRoute("/_authenticated/owner/command/search")({
  head: () => ({
    meta: [
      { title: "Search Everything · Mission Control · ZOMBIEREX" },
      { name: "description", content: "Search users, businesses, products, invoices and campaigns." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Search Everything · Mission Control" },
      { property: "og:description", content: "Global ZOMBIEREX admin search." },
    ],
  }),
  component: SearchAll,
});

function SearchAll() {
  const fn = useServerFn(commandSearch);
  const [term, setTerm] = useState("");
  const [q, setQ] = useState("");
  const res = useQuery({
    queryKey: ["command", "search", q],
    queryFn: () => fn({ data: { q } }),
    enabled: q.length > 0,
    retry: false,
  });

  const d = res.data;

  return (
    <div className="space-y-5">
      <div>
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ SEARCH EVERYTHING</p>
        <h1 className="text-2xl font-semibold">Global lookup</h1>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(term.trim());
        }}
      >
        <input
          style={inputStyle}
          placeholder="handle, business, product, invoice number, campaign…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button className="btn-solid whitespace-nowrap" type="submit">Search</button>
      </form>

      {!q && <Empty label="Enter a search term" />}
      {res.isLoading && <p className="text-sm opacity-60">Searching…</p>}

      {d && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel tag="USERS" title={`Users (${d.users.length})`}>
            {d.users.length === 0 ? <Empty /> : (
              <ul className="space-y-2">
                {d.users.map((u: any) => (
                  <li key={u.id}>
                    <Link to="/owner/command/users/$id" params={{ id: u.id }} className="flex items-center justify-between text-[13px]">
                      <span className="truncate">@{u.handle} · {u.display_name}</span>
                      <Pill tone={u.is_suspended ? "bad" : "ok"}>{u.is_suspended ? "BLOCKED" : "ACTIVE"}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel tag="BUSINESSES" title={`Businesses (${d.businesses.length})`}>
            {d.businesses.length === 0 ? <Empty /> : (
              <ul className="space-y-2">
                {d.businesses.map((b: any) => (
                  <li key={b.id} className="flex items-center justify-between text-[13px]">
                    <span className="truncate">{b.business_name}</span>
                    <Pill tone={statusTone(b.verification_status)}>{b.verification_status}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel tag="CATALOG" title={`Products & listings (${d.products.length + d.listings.length})`}>
            {d.products.length + d.listings.length === 0 ? <Empty /> : (
              <ul className="space-y-2 text-[13px]">
                {d.products.map((p: any) => (
                  <li key={p.id} className="flex justify-between"><span className="truncate">{p.name}</span><span>{money(p.price_cents, p.currency)}</span></li>
                ))}
                {d.listings.map((l: any) => (
                  <li key={l.id} className="flex justify-between"><span className="truncate">{l.title}</span><span>{money(l.price_cents, l.currency)}</span></li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel tag="MONEY & ADS" title={`Invoices, campaigns, cases`}>
            {d.invoices.length + d.campaigns.length + d.cases.length === 0 ? <Empty /> : (
              <ul className="space-y-2 text-[13px]">
                {d.invoices.map((i: any) => (
                  <li key={i.id} className="flex justify-between"><span>{i.number}</span><span>{money(i.total_cents, i.currency)}</span></li>
                ))}
                {d.campaigns.map((c: any) => (
                  <li key={c.id} className="flex justify-between"><span className="truncate">{c.name}</span><Pill tone={statusTone(c.status)}>{c.status}</Pill></li>
                ))}
                {d.cases.map((c: any) => (
                  <li key={c.id} className="flex justify-between"><span className="truncate">{c.subject}</span><Pill tone={statusTone(c.status)}>{c.status}</Pill></li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
