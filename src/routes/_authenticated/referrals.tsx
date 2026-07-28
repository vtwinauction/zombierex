import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listMyReferrals } from "@/lib/gamification.functions";
import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({
    meta: [
      { title: "Invite Riders · ZOMBIEREX" },
      { name: "description", content: "Share your invite code and earn XP for every rider who joins ZOMBIEREX." },
      { property: "og:title", content: "Invite Riders · ZOMBIEREX" },
      { property: "og:description", content: "Every rider you bring in earns you XP toward the next tier." },
    ],
  }),
  component: ReferralsPage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ReferralsPage() {
  const fn = useServerFn(listMyReferrals);
  const q = useQuery({ queryKey: ["my-referrals"], queryFn: () => fn() });
  const data = q.data;
  const code = data?.referral_code ?? "";
  const shareUrl = typeof window !== "undefined" && code
    ? `${window.location.origin}/auth?ref=${encodeURIComponent(code)}`
    : "";

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  }

  async function share() {
    const text = `Join me on ZOMBIEREX. Use code ${code}. ${shareUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: "ZOMBIEREX", text, url: shareUrl }); return; }
      catch { /* user cancelled */ }
    }
    copy(text, "Invite");
  }

  return (
    <PullToRefresh onRefresh={async () => { await q.refetch(); }}>
      <div className="pb-24">
        <div className="flex items-end justify-between px-4 pt-6">
          <div>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>PACK</p>
            <h1 className="serif mt-2 text-4xl italic" style={{ color: "var(--color-ink)" }}>Invite Riders</h1>
          </div>
          <Link to="/rewards" className="mono-tag" style={{ color: "var(--color-titanium)" }}>REWARDS ▸</Link>
        </div>

        {/* Stat strip */}
        <div className="mx-4 mt-6 grid grid-cols-3 gap-2">
          <Stat label="INVITED" value={data?.total ?? 0} />
          <Stat label="XP EARNED" value={data?.xp_earned ?? 0} />
          <Stat label="PER JOIN" value="+150" />
        </div>

        {/* Code card */}
        <section
          className="mx-4 mt-6 border p-5"
          style={{ borderColor: "var(--color-hair-strong)", background: "var(--color-graphite)" }}
        >
          <p className="mono-tag" style={{ color: "var(--color-neon)" }}>YOUR INVITE CODE</p>
          {q.isLoading ? (
            <p className="mono-tag mt-4" style={{ color: "var(--color-titanium)" }}>LOADING…</p>
          ) : code ? (
            <>
              <p className="serif mt-2 text-4xl italic tracking-wider" style={{ color: "var(--color-ink)" }}>
                {code}
              </p>
              <p className="mt-3 text-[12px] break-all" style={{ color: "var(--color-silver)" }}>{shareUrl}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => copy(code, "Code")}
                  className="mono-tag flex-1 py-3"
                  style={{ border: "1px solid var(--color-hair-strong)", color: "var(--color-ink)" }}>
                  COPY CODE
                </button>
                <button onClick={share} className="btn-neon flex-1" style={{ padding: "12px", fontSize: 11 }}>
                  SHARE ▸
                </button>
              </div>
            </>
          ) : (
            <p className="mt-3 text-[13px]" style={{ color: "var(--color-silver)" }}>
              No code assigned yet. Check back after your next check-in.
            </p>
          )}
        </section>

        {/* How it works */}
        <section className="mx-4 mt-6 border p-4"
          style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}>
          <p className="mono-tag mb-3" style={{ color: "var(--color-titanium)" }}>HOW IT WORKS</p>
          <ol className="space-y-2 text-[13px]" style={{ color: "var(--color-ink)" }}>
            <li><span style={{ color: "var(--color-neon)" }}>1.</span> Share your code with a rider you trust.</li>
            <li><span style={{ color: "var(--color-neon)" }}>2.</span> They sign up and enter your code during onboarding.</li>
            <li><span style={{ color: "var(--color-neon)" }}>3.</span> You earn <strong>+150 XP</strong>, they get a welcome bonus.</li>
          </ol>
        </section>

        {/* Referral list */}
        <section className="mx-4 mt-6">
          <p className="mono-tag mb-2" style={{ color: "var(--color-titanium)" }}>
            RIDERS YOU BROUGHT IN · {data?.total ?? 0}
          </p>
          {data && data.total === 0 && (
            <div className="border border-dashed p-6 text-center" style={{ borderColor: "var(--color-hair-strong)" }}>
              <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
                No riders yet. Share your code above to start earning.
              </p>
            </div>
          )}
          <ul className="space-y-2">
            {(data?.referrals ?? []).map((r) => (
              <li key={r.id} className="border p-3 flex items-center gap-3"
                style={{ borderColor: "var(--color-hair-strong)", background: "var(--color-graphite)" }}>
                {r.profile?.avatar_url ? (
                  <img src={r.profile.avatar_url} alt="" className="h-10 w-10 flex-none rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 flex-none rounded-full"
                    style={{ background: "var(--color-obsidian)", border: "1px solid var(--color-hair)" }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>
                    {r.profile?.display_name || r.profile?.handle || "New rider"}
                  </p>
                  <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
                    JOINED {fmtDate(r.created_at)}
                  </p>
                </div>
                <span className="mono-tag" style={{
                  color: r.status === "activated" ? "var(--color-neon)" : "var(--color-titanium)",
                }}>
                  {r.status.toUpperCase()}
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
    <div className="border p-3 text-center"
      style={{ borderColor: "var(--color-hair-strong)", background: "var(--color-graphite)" }}>
      <p className="serif text-2xl italic" style={{ color: "var(--color-ink)" }}>{value}</p>
      <p className="mono-tag mt-1" style={{ color: "var(--color-titanium)", fontSize: 9 }}>{label}</p>
    </div>
  );
}
