import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getCreatorProfile, subscribeToCreator, tipCreator, sendCollabRequest } from "@/lib/creator.functions";
import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/creator/$id")({
  head: () => ({ meta: [{ title: "Creator · ZOMBIEREX" }] }),
  component: CreatorPublicPage,
});

function fmtUSD(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

function CreatorPublicPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const get = useServerFn(getCreatorProfile);
  const sub = useServerFn(subscribeToCreator);
  const tip = useServerFn(tipCreator);
  const collab = useServerFn(sendCollabRequest);

  const { data, isLoading } = useQuery({ queryKey: ["creator", id], queryFn: () => get({ data: { user_id: id } }) });
  const [busy, setBusy] = useState<string | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipAmt, setTipAmt] = useState(500);
  const [tipMsg, setTipMsg] = useState("");
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabSubj, setCollabSubj] = useState("");
  const [collabMsg, setCollabMsg] = useState("");
  const [collabBudget, setCollabBudget] = useState<number | "">("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const c = data as any;

  const creatorId = c?.id as string | undefined;

  async function doSub(tierId: string | null) {
    if (!creatorId) return;
    setBusy("sub"); setErr(null); setOk(null);
    try { await sub({ data: { creator_id: creatorId, tier_id: tierId } }); setOk("Subscribed"); qc.invalidateQueries({ queryKey: ["creator", id] }); }
    catch (e: any) { setErr(e?.message ?? "Failed"); } finally { setBusy(null); }
  }
  async function doTip() {
    if (!creatorId) return;
    setBusy("tip"); setErr(null); setOk(null);
    try { await tip({ data: { creator_id: creatorId, amount_cents: tipAmt, message: tipMsg || undefined } }); setOk("Tip sent"); setTipOpen(false); setTipMsg(""); }
    catch (e: any) { setErr(e?.message ?? "Failed"); } finally { setBusy(null); }
  }
  async function doCollab() {
    if (!creatorId) return;
    setBusy("collab"); setErr(null); setOk(null);
    try {
      await collab({ data: { creator_id: creatorId, subject: collabSubj, message: collabMsg, budget_cents: typeof collabBudget === "number" ? collabBudget : undefined } });
      setOk("Request sent"); setCollabOpen(false); setCollabSubj(""); setCollabMsg(""); setCollabBudget("");
    } catch (e: any) { setErr(e?.message ?? "Failed"); } finally { setBusy(null); }
  }


  return (
    <PullToRefresh onRefresh={() => qc.invalidateQueries({ queryKey: ["creator", id] })}>
    <div className="pb-24">

      {isLoading && <p className="px-4 pt-6 mono-tag" style={{ color: "var(--color-titanium)" }}>LOADING…</p>}
      {!isLoading && !c && (
        <div className="mx-4 mt-6 border border-dashed p-6 text-center" style={{ borderColor: "var(--color-hair-strong)" }}>
          <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>NOT A CREATOR</p>
          <Link to="/creators" className="mono-tag font-bold mt-3 inline-block" style={{ color: "var(--color-neon)" }}>BROWSE ▸</Link>
        </div>
      )}

      {c && (
        <>
          <div className="relative">
            <div className="h-56 w-full">
              {c.profile?.avatar_url ? (
                <img src={c.profile.avatar_url} className="h-full w-full object-cover" style={{ filter: "grayscale(0.25) contrast(1.1)" }} />
              ) : <div className="h-full w-full" style={{ background: "var(--color-slate)" }} />}
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.95) 100%)" }} />
            </div>
            <div className="absolute inset-x-4 bottom-3">
              <div className="flex items-center gap-2">
                <span className="mono-tag font-bold px-2 py-1" style={{ background: "var(--color-neon)", color: "#0a0a0a" }}>
                  {String(c.category).replace(/_/g," ").toUpperCase()}
                </span>
                {c.is_verified && <span className="mono-tag font-bold px-2 py-1" style={{ background: "rgba(255,255,255,0.1)", color: "var(--color-ink)", border: "1px solid var(--color-neon)" }}>VERIFIED</span>}
              </div>
              <h1 className="serif mt-2 text-3xl italic leading-tight" style={{ color: "var(--color-ink)" }}>
                {c.profile?.display_name ?? c.profile?.handle}
              </h1>
              {c.tagline && <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{c.tagline}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px mx-4 mt-4 border" style={{ borderColor: "var(--color-hair-strong)", background: "var(--color-hair)" }}>
            <MiniStat label="SUBS" value={c.subscribers_count ?? 0} />
            <MiniStat label="FOLLOWERS" value={c.profile?.followers_count ?? 0} />
            <MiniStat label="TIPS" value={fmtUSD(c.tips_total_cents ?? 0)} />
          </div>

          <div className="px-4 pt-4 grid grid-cols-2 gap-2">
            <button onClick={() => setTipOpen(true)} className="btn-neon" style={{ padding: "12px", fontSize: 11 }}>SEND TIP ▸</button>
            {c.accepts_collabs && (
              <button onClick={() => setCollabOpen(true)} className="tap border font-bold" style={{ borderColor: "var(--color-neon)", color: "var(--color-neon)", padding: "12px", fontSize: 11, letterSpacing: 1 }}>
                REQUEST COLLAB ▸
              </button>
            )}
          </div>

          {ok && <p className="mx-4 mt-3 mono-tag" style={{ color: "var(--color-neon)" }}>{ok}</p>}
          {err && <p className="mx-4 mt-3 mono-tag" style={{ color: "#ff3d3d" }}>{err}</p>}

          <div className="px-4 pt-6">
            <p className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>SUBSCRIPTION TIERS</p>
            <div className="mt-2 space-y-2">
              {(c.tiers ?? []).length === 0 && (
                <button disabled={busy === "sub"} onClick={() => doSub(null)}
                  className="w-full border p-3 flex items-center justify-between"
                  style={{ borderColor: "var(--color-hair-strong)", background: "rgba(255,255,255,0.03)", color: "var(--color-ink)" }}>
                  <span className="text-sm font-bold">Free follow-plus</span>
                  <span className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>{c.my_subscription ? "SUBSCRIBED" : "SUBSCRIBE ▸"}</span>
                </button>
              )}
              {(c.tiers ?? []).map((t: any) => {
                const active = c.my_subscription?.tier_id === t.id && c.my_subscription?.status === "active";
                return (
                  <button key={t.id} disabled={busy === "sub"} onClick={() => doSub(t.id)}
                    className="w-full border p-3 text-left"
                    style={{ borderColor: active ? "var(--color-neon)" : "var(--color-hair-strong)", background: "rgba(255,255,255,0.03)" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>{t.name}</p>
                      <p className="mono-num font-bold" style={{ color: "var(--color-neon)" }}>{fmtUSD(t.price_cents)}/mo</p>
                    </div>
                    {t.description && <p className="mt-1 text-xs" style={{ color: "var(--color-silver)" }}>{t.description}</p>}
                    <p className="mt-2 mono-tag font-bold" style={{ color: active ? "var(--color-neon)" : "var(--color-titanium)" }}>
                      {active ? "SUBSCRIBED" : "SUBSCRIBE ▸"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {tipOpen && (
        <Modal onClose={() => setTipOpen(false)} title="Send a tip">
          <div className="grid grid-cols-4 gap-2">
            {[100, 500, 1000, 2500].map((n) => (
              <button key={n} onClick={() => setTipAmt(n)}
                className="tap border py-2 mono-num font-bold"
                style={{ borderColor: tipAmt === n ? "var(--color-neon)" : "var(--color-hair-strong)", color: "var(--color-ink)" }}>
                {fmtUSD(n)}
              </button>
            ))}
          </div>
          <input type="number" min={100} step={100} value={tipAmt} onChange={(e) => setTipAmt(Number(e.target.value))}
            className="mt-3 w-full border px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }} />
          <textarea placeholder="Message (optional)" value={tipMsg} onChange={(e) => setTipMsg(e.target.value)}
            className="mt-3 w-full border px-3 py-2 text-sm" rows={3}
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }} />
          <button disabled={busy === "tip"} onClick={doTip} className="btn-neon mt-4 w-full" style={{ padding: "12px", fontSize: 11 }}>
            {busy === "tip" ? "SENDING…" : `SEND ${fmtUSD(tipAmt)} ▸`}
          </button>
        </Modal>
      )}

      {collabOpen && (
        <Modal onClose={() => setCollabOpen(false)} title="Request collab">
          <input placeholder="Subject" value={collabSubj} onChange={(e) => setCollabSubj(e.target.value)}
            className="w-full border px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }} />
          <textarea placeholder="Message" value={collabMsg} onChange={(e) => setCollabMsg(e.target.value)} rows={4}
            className="mt-3 w-full border px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }} />
          <input type="number" placeholder="Budget cents (optional)" value={collabBudget} onChange={(e) => setCollabBudget(e.target.value ? Number(e.target.value) : "")}
            className="mt-3 w-full border px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }} />
          <button disabled={busy === "collab" || !collabSubj.trim() || !collabMsg.trim()} onClick={doCollab}
            className="btn-neon mt-4 w-full" style={{ padding: "12px", fontSize: 11 }}>
            {busy === "collab" ? "SENDING…" : "SEND REQUEST ▸"}
          </button>
        </Modal>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-3 text-center">
      <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{label}</p>
      <p className="mono-num mt-1 text-sm font-bold" style={{ color: "var(--color-ink)" }}>{value}</p>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-md p-4 border-t" style={{ background: "var(--color-obsidian, #0a0a0a)", borderColor: "var(--color-neon)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="serif text-xl italic" style={{ color: "var(--color-ink)" }}>{title}</h2>
          <button onClick={onClose} className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>CLOSE ✕</button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
