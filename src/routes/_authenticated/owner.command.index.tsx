import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCommandOverview } from "@/lib/command.functions";
import { Metric, Panel, money, num } from "@/components/command/ui";
import {
  BarChart,
  BarMeter,
  CockpitHeader,
  Gauge,
  Lamp,
} from "@/components/command/instruments";

export const Route = createFileRoute("/_authenticated/owner/command/")({
  head: () => ({
    meta: [
      { title: "Overview · Mission Control · ZOMBIEREX" },
      { name: "description", content: "Live platform overview: users, businesses, revenue and alerts." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Overview · Mission Control" },
      { property: "og:description", content: "Live ZOMBIEREX platform overview." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const fn = useServerFn(getCommandOverview);
  const q = useQuery({
    queryKey: ["command", "overview"],
    queryFn: () => fn({ data: undefined as never }),
    retry: false,
  });

  if (q.isLoading) return <p className="text-sm opacity-60">Loading live platform telemetry…</p>;
  if (q.error) return <p className="text-sm" style={{ color: "var(--color-heat)" }}>{String((q.error as Error).message)}</p>;
  const d = q.data!;

  return (
    <div className="space-y-5">
      <CockpitHeader
        title="Command overview"
        subtitle="Live telemetry from every paddock system — users, commerce and revenue."
      />

      {/* Instrument cluster */}
      <Panel tag="INSTRUMENT CLUSTER" title="Primary flight display">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Gauge
            label="Active riders / 30d"
            value={d.users.active30d}
            max={Math.max(1, d.users.total)}
            display={num(d.users.active30d)}
            unit="users"
          />
          <Gauge
            label="Revenue today"
            value={d.revenue.todayGross}
            max={Math.max(1, d.revenue.monthGross)}
            display={money(d.revenue.todayGross)}
            unit="vs month"
          />
          <Gauge
            label="Orders today"
            value={d.commerce.ordersToday}
            max={Math.max(1, d.commerce.ordersMonth)}
            display={num(d.commerce.ordersToday)}
            unit="orders"
          />
          <Gauge
            label="Containment · alerts"
            value={
              d.attention.reportsOpen +
              d.attention.supportOpen +
              d.attention.adRequestsPending +
              d.attention.businessesPending
            }
            max={50}
            redline={0.4}
            display={num(
              d.attention.reportsOpen +
                d.attention.supportOpen +
                d.attention.adRequestsPending +
                d.attention.businessesPending,
            )}
            unit="open"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BarMeter
            label="Subscribed businesses"
            value={d.businesses.subscribed}
            max={Math.max(1, d.businesses.total)}
            display={`${num(d.businesses.subscribed)} / ${num(d.businesses.total)}`}
          />
          <BarMeter
            label="Net vs gross today"
            value={d.revenue.todayNet}
            max={Math.max(1, d.revenue.todayGross)}
            display={money(d.revenue.todayNet)}
            tone="amber"
          />
          <BarMeter
            label="Failed payments"
            value={d.payments.failed}
            max={Math.max(1, d.payments.failed + d.payments.pending + 1)}
            display={num(d.payments.failed)}
            tone="heat"
          />
          <BarMeter
            label="Refunds this month"
            value={d.revenue.refundsMonth}
            max={Math.max(1, d.revenue.monthGross)}
            display={money(d.revenue.refundsMonth)}
            tone="heat"
          />
        </div>
      </Panel>

      {/* Revenue mix chart */}
      <Panel
        tag="TELEMETRY"
        title="Revenue streams · this month"
        right={
          <Link to="/owner/command/finance" className="btn-ghost text-xs">
            Finance →
          </Link>
        }
      >
        <BarChart
          format={(n) => money(n)}
          series={[
            { label: "Ads", value: d.revenue.adsMonth },
            { label: "Subs", value: d.revenue.subsMonth },
            { label: "Commission", value: d.revenue.commissionMonth },
            { label: "Service fees", value: d.revenue.serviceFeesMonth },
            { label: "Refunds", value: d.revenue.refundsMonth },
          ]}
        />
      </Panel>

      {/* Annunciator panel */}
      <Panel tag="ANNUNCIATOR" title="Warning lamps">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Lamp label="Open reports" active={d.attention.reportsOpen > 0} tone="heat">
            {num(d.attention.reportsOpen)}
          </Lamp>
          <Lamp label="Support cases" active={d.attention.supportOpen > 0}>
            {num(d.attention.supportOpen)}
          </Lamp>
          <Lamp label="Ad requests" active={d.attention.adRequestsPending > 0}>
            {num(d.attention.adRequestsPending)}
          </Lamp>
          <Lamp label="Businesses pending" active={d.attention.businessesPending > 0}>
            {num(d.attention.businessesPending)}
          </Lamp>
        </div>
      </Panel>


      <Panel tag="PEOPLE" title="Users">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Metric label="Total users" value={num(d.users.total)} hi />
          <Metric label="New today" value={num(d.users.today)} />
          <Metric label="New this month" value={num(d.users.month)} />
          <Metric label="Active (30d)" value={num(d.users.active30d)} />
          <Metric label="Blocked" value={num(d.users.blocked)} />
        </div>
      </Panel>

      <Panel tag="BUSINESS" title="Businesses">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Total" value={num(d.businesses.total)} />
          <Metric label="New this month" value={num(d.businesses.new)} />
          <Metric label="Subscribed" value={num(d.businesses.subscribed)} hi />
          <Metric label="Pending review" value={num(d.businesses.pending)} />
        </div>
      </Panel>

      <Panel tag="REVENUE" title="Money" right={<Link to="/owner/command/finance" className="btn-ghost text-xs">Finance →</Link>}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Metric label="Revenue today" value={money(d.revenue.todayGross)} sub={`${num(d.revenue.todayTx)} transactions`} hi />
          <Metric label="This month" value={money(d.revenue.monthGross)} />
          <Metric label="This year" value={money(d.revenue.yearGross)} />
          <Metric label="Net today" value={money(d.revenue.todayNet)} />
          <Metric label="Advertising (mo)" value={money(d.revenue.adsMonth)} />
          <Metric label="Subscriptions (mo)" value={money(d.revenue.subsMonth)} />
          <Metric label="Marketplace commission (mo)" value={money(d.revenue.commissionMonth)} />
          <Metric label="Service fees (mo)" value={money(d.revenue.serviceFeesMonth)} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Refunds (mo)" value={money(d.revenue.refundsMonth)} />
          <Metric label="Pending payments" value={num(d.payments.pending)} />
          <Metric label="Failed payments" value={num(d.payments.failed)} />
          <Metric label="Products" value={num(d.commerce.products)} />
        </div>
      </Panel>

      <Panel tag="COMMERCE" title="Orders">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Metric label="Orders today" value={num(d.commerce.ordersToday)} />
          <Metric label="Orders this month" value={num(d.commerce.ordersMonth)} />
          <Metric label="Active campaigns" value={num(d.attention.activeCampaigns)} />
        </div>
      </Panel>

      <Panel tag="ATTENTION" title="Needs action">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link to="/owner/command/moderation"><Metric label="Open reports" value={num(d.attention.reportsOpen)} hi={d.attention.reportsOpen > 0} /></Link>
          <Link to="/owner/command/crm"><Metric label="Open support cases" value={num(d.attention.supportOpen)} /></Link>
          <Link to="/owner/command/ads"><Metric label="Ad requests pending" value={num(d.attention.adRequestsPending)} /></Link>
          <Link to="/owner/command/businesses"><Metric label="Businesses pending" value={num(d.attention.businessesPending)} /></Link>
        </div>
      </Panel>
    </div>
  );
}
