import { formatMoney } from "@/lib/money";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPayoutsLedger } from "@/lib/creator.functions";
import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/_authenticated/creator/payouts")({
  head: () => ({
    meta: [
      { title: "Payouts · ZOMBIEREX" },
      {
        name: "description",
        content: "Track tips, subscribers, and lifetime earnings from your ZOMBIEREX audience.",
      },
      { property: "og:title", content: "Creator Payouts · ZOMBIEREX" },
      { property: "og:description", content: "Every tip and subscription, one clean ledger." },
    ],
  }),
  component: PayoutsPage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function PayoutsPage() {
  const fn = useServerFn(getMyPayoutsLedger);
  const q = useQuery({ queryKey: ["creator-payouts"], queryFn: () => fn() });
  const data = q.data;

  if (!q.isLoading && data && !data.is_creator) {
    return (
      <div className="px-4 pt-20 pb-24 text-center">
        <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
          NOT A CREATOR
        </p>
        <h1 className="serif mt-3 text-3xl italic" style={{ color: "var(--color-ink)" }}>
          Apply first
        </h1>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-silver)" }}>
          Only approved creators can earn tips and subscriptions.
        </p>
        <Link
          to="/creator/apply"
          className="btn-neon mt-6 inline-block"
          style={{ padding: "12px 18px", fontSize: 11 }}
        >
          BECOME A CREATOR ▸
        </Link>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <PullToRefresh
      onRefresh={async () => {
        await q.refetch();
      }}
    >
      <div className="pb-24">
        <div className="flex items-end justify-between px-4 pt-6">
          <div>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
              LEDGER
            </p>
            <h1 className="serif mt-2 text-4xl italic" style={{ color: "var(--color-ink)" }}>
              Payouts
            </h1>
          </div>
          <Link
            to="/creator/dashboard"
            className="mono-tag"
            style={{ color: "var(--color-titanium)" }}
          >
            ← DASHBOARD
          </Link>
        </div>

        {/* Summary */}
        <section
          className="mx-4 mt-6 border p-5"
          style={{ borderColor: "var(--color-hair-strong)", background: "var(--color-graphite)" }}
        >
          <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
            LIFETIME TIPS
          </p>
          <p className="serif mt-1 text-5xl italic" style={{ color: "var(--color-ink)" }}>
            {s ? formatMoney(s.lifetime_tips_cents) : "—"}
          </p>
          <div
            className="mt-4 grid grid-cols-3 gap-2 border-t pt-4"
            style={{ borderColor: "var(--color-hair)" }}
          >
            <Stat label="THIS MONTH" value={s ? formatMoney(s.tips_this_month_cents) : "—"} />
            <Stat label="SUBSCRIBERS" value={s?.subscribers ?? 0} />
            <Stat label="ACTIVE SUBS" value={s?.active_subscriptions ?? 0} />
          </div>
        </section>

        {/* Payout method note */}
        <section
          className="mx-4 mt-4 border p-3"
          style={{ borderColor: "var(--color-hair)", background: "var(--color-obsidian)" }}
        >
          <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
            PAYOUT METHOD
          </p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--color-silver)" }}>
            Bank / card payouts activate once ZOMBIEREX Payments goes live. Your balance keeps
            accruing.
          </p>
        </section>

        {/* Tips */}
        <section className="mx-4 mt-6">
          <p className="mono-tag mb-2" style={{ color: "var(--color-titanium)" }}>
            RECENT TIPS · {data?.tips.length ?? 0}
          </p>
          {(data?.tips ?? []).length === 0 && (
            <div
              className="border border-dashed p-6 text-center"
              style={{ borderColor: "var(--color-hair-strong)" }}
            >
              <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
                No tips yet.
              </p>
            </div>
          )}
          <ul className="space-y-2">
            {(data?.tips ?? []).map((t) => (
              <li
                key={t.id}
                className="border p-3 flex items-center gap-3"
                style={{
                  borderColor: "var(--color-hair-strong)",
                  background: "var(--color-graphite)",
                }}
              >
                {t.supporter?.avatar_url ? (
                  <img
                    src={t.supporter.avatar_url}
                    alt=""
                    className="h-9 w-9 flex-none rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="h-9 w-9 flex-none rounded-full"
                    style={{
                      background: "var(--color-obsidian)",
                      border: "1px solid var(--color-hair)",
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {t.supporter?.display_name || "Supporter"}
                  </p>
                  {t.message && (
                    <p className="text-[12px] truncate" style={{ color: "var(--color-silver)" }}>
                      "{t.message}"
                    </p>
                  )}
                  <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
                    {fmtDate(t.created_at)}
                  </p>
                </div>
                <p className="serif text-lg italic" style={{ color: "var(--color-neon)" }}>
                  {formatMoney(t.amount_cents, t.currency)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Subscriptions */}
        <section className="mx-4 mt-6">
          <p className="mono-tag mb-2" style={{ color: "var(--color-titanium)" }}>
            SUBSCRIPTIONS · {data?.subscriptions.length ?? 0}
          </p>
          {(data?.subscriptions ?? []).length === 0 && (
            <div
              className="border border-dashed p-6 text-center"
              style={{ borderColor: "var(--color-hair-strong)" }}
            >
              <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
                No subscribers yet.
              </p>
            </div>
          )}
          <ul className="space-y-2">
            {(data?.subscriptions ?? []).map((sub) => (
              <li
                key={sub.id}
                className="border p-3 flex items-center gap-3"
                style={{
                  borderColor: "var(--color-hair-strong)",
                  background: "var(--color-graphite)",
                }}
              >
                {sub.subscriber?.avatar_url ? (
                  <img
                    src={sub.subscriber.avatar_url}
                    alt=""
                    className="h-9 w-9 flex-none rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="h-9 w-9 flex-none rounded-full"
                    style={{
                      background: "var(--color-obsidian)",
                      border: "1px solid var(--color-hair)",
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {sub.subscriber?.display_name || "Subscriber"}
                  </p>
                  <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
                    SINCE {fmtDate(sub.created_at)}
                  </p>
                </div>
                <span
                  className="mono-tag"
                  style={{
                    color: sub.status === "active" ? "var(--color-neon)" : "var(--color-titanium)",
                  }}
                >
                  {sub.status.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PullToRefresh>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <p className="serif text-lg italic" style={{ color: "var(--color-ink)" }}>
        {value}
      </p>
      <p className="mono-tag mt-1" style={{ color: "var(--color-titanium)", fontSize: 9 }}>
        {label}
      </p>
    </div>
  );
}
