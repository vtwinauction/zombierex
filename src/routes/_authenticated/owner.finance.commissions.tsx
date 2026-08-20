import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listFeeRules,
  upsertFeeRule,
  deleteFeeRule,
  checkFinanceAccess,
} from "@/lib/finance.functions";
import { computeSplit, describeRule, formatMoney, type FeeRule } from "@/lib/commission";
import { DEFAULT_CURRENCY, inputStep, toDecimalString, toMinorUnits } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/owner/finance/commissions")({
  head: () => ({
    meta: [
      { title: "Commission Rules — ZOMBIEREX Owner" },
      { name: "description", content: "Configure marketplace commission tiers and fee rules." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Commission Rules — ZOMBIEREX Owner" },
      {
        property: "og:description",
        content: "Configure marketplace commission tiers and fee rules.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommissionsPage,
});

const KINDS = ["order", "tip", "creator_subscription", "plan", "ad", "other"] as const;
const SCOPES = ["default", "category", "seller", "seller_type", "country", "promo"] as const;

type Draft = {
  id?: string;
  label: string;
  kind: (typeof KINDS)[number];
  scope: (typeof SCOPES)[number];
  scope_value: string;
  percent: string;
  fixed: string;
  min: string;
  max: string;
  priority: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const EMPTY: Draft = {
  label: "",
  kind: "order",
  scope: "category",
  scope_value: "",
  percent: "5",
  fixed: "0",
  min: "0.300",
  max: "",
  priority: "0",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

function toDraft(r: FeeRule): Draft {
  return {
    id: r.id,
    label: r.label,
    kind: r.kind,
    scope: r.scope,
    scope_value: r.scope_value ?? "",
    percent: (r.percent_bps / 100).toString(),
    fixed: toDecimalString(r.fixed_cents, r.currency ?? DEFAULT_CURRENCY),
    min: toDecimalString(r.min_fee_cents, r.currency ?? DEFAULT_CURRENCY),
    max: r.max_fee_cents != null ? toDecimalString(r.max_fee_cents, r.currency ?? DEFAULT_CURRENCY) : "",
    priority: String(r.priority),
    starts_at: r.starts_at ? r.starts_at.slice(0, 10) : "",
    ends_at: r.ends_at ? r.ends_at.slice(0, 10) : "",
    is_active: r.is_active,
  };
}

/**
 * Currency-aware write path. `* 100` here would store BHD 2.500 as 250 fils —
 * a silent 10x under-charge that the read path (`/100`) hides perfectly.
 */
const minor = (v: string, currency: string = DEFAULT_CURRENCY) =>
  toMinorUnits(parseFloat(v || "0") || 0, currency);

function CommissionsPage() {
  const qc = useQueryClient();
  const load = useServerFn(listFeeRules);
  const save = useServerFn(upsertFeeRule);
  const remove = useServerFn(deleteFeeRule);
  const access = useServerFn(checkFinanceAccess);

  const gate = useQuery({
    queryKey: ["finance", "access"],
    queryFn: () => access({ data: undefined as any }),
  });
  const rules = useQuery({
    queryKey: ["finance", "fee-rules"],
    queryFn: () => load({ data: undefined as any }),
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState("100");
  // Rules are platform-currency for now; kept as a variable so a per-rule
  // currency selector only needs wiring here.
  const ruleCurrency = DEFAULT_CURRENCY;

  const canWrite = !!gate.data?.canWrite;

  async function submit() {
    if (!draft) return;
    setBusy(true);
    setErr(null);
    try {
      await save({
        data: {
          id: draft.id,
          label: draft.label.trim(),
          kind: draft.kind,
          scope: draft.scope,
          scope_value: draft.scope === "default" ? null : draft.scope_value.trim(),
          percent_bps: Math.round((parseFloat(draft.percent || "0") || 0) * 100),
          fixed_cents: minor(draft.fixed, ruleCurrency),
          min_fee_cents: minor(draft.min, ruleCurrency),
          max_fee_cents: draft.max ? minor(draft.max, ruleCurrency) : null,
          currency: null,
          priority: parseInt(draft.priority || "0", 10),
          starts_at: draft.starts_at ? new Date(draft.starts_at).toISOString() : null,
          ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
          is_active: draft.is_active,
          notes: null,
        },
      });
      await qc.invalidateQueries({ queryKey: ["finance", "fee-rules"] });
      setDraft(null);
    } catch (e: any) {
      setErr(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this commission rule?")) return;
    try {
      await remove({ data: { id } });
      await qc.invalidateQueries({ queryKey: ["finance", "fee-rules"] });
    } catch (e: any) {
      setErr(e?.message ?? "Delete failed");
    }
  }

  const list = (rules.data ?? []) as unknown as FeeRule[];
  const previewGross = minor(preview, ruleCurrency);

  return (
    <div className="space-y-5 p-5">
      <div className="card-surface p-4">
        <p className="mono-tag text-[10px] opacity-60">HOW IT RESOLVES</p>
        <p className="mt-1 text-[12px]" style={{ color: "var(--color-silver)" }}>
          For every transaction the most specific active rule wins: promo → seller → category →
          seller type → country → default. Changes apply to the very next transaction, no release
          required.
        </p>
      </div>

      {err && (
        <div
          className="rounded px-3 py-2 text-[12px]"
          style={{ background: "rgba(220,60,60,0.1)", border: "1px solid rgba(220,60,60,0.4)" }}
        >
          {err}
        </div>
      )}

      {canWrite && !draft && (
        <button className="btn-solid w-full" onClick={() => setDraft({ ...EMPTY })}>
          + New commission rule
        </button>
      )}

      {draft && (
        <div className="card-surface space-y-3 p-4">
          <p className="mono-tag text-[10px]" style={{ color: "#00c853" }}>
            {draft.id ? "EDIT RULE" : "NEW RULE"}
          </p>
          <Field label="Label">
            <input
              className="zx-input"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="Parts category — 3%"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Applies to">
              <select
                className="zx-input"
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value as any })}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Scope">
              <select
                className="zx-input"
                value={draft.scope}
                onChange={(e) => setDraft({ ...draft, scope: e.target.value as any })}
              >
                {SCOPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {draft.scope !== "default" && (
            <Field
              label={
                draft.scope === "seller"
                  ? "Seller ID"
                  : draft.scope === "country"
                    ? "Country code"
                    : "Target value"
              }
            >
              <input
                className="zx-input"
                value={draft.scope_value}
                onChange={(e) => setDraft({ ...draft, scope_value: e.target.value })}
                placeholder={
                  draft.scope === "category"
                    ? "parts"
                    : draft.scope === "promo"
                      ? "* for platform-wide"
                      : ""
                }
              />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Percent (%)">
              <input
                className="zx-input"
                inputMode="decimal"
                value={draft.percent}
                onChange={(e) => setDraft({ ...draft, percent: e.target.value })}
              />
            </Field>
            <Field label={`Fixed fee (${ruleCurrency})`}>
              <input
                className="zx-input"
                inputMode="decimal"
                step={inputStep(ruleCurrency)}
                value={draft.fixed}
                onChange={(e) => setDraft({ ...draft, fixed: e.target.value })}
              />
            </Field>
            <Field label={`Minimum fee (${ruleCurrency})`}>
              <input
                className="zx-input"
                inputMode="decimal"
                step={inputStep(ruleCurrency)}
                value={draft.min}
                onChange={(e) => setDraft({ ...draft, min: e.target.value })}
              />
            </Field>
            <Field label={`Maximum fee (${ruleCurrency})`}>
              <input
                className="zx-input"
                inputMode="decimal"
                step={inputStep(ruleCurrency)}
                value={draft.max}
                onChange={(e) => setDraft({ ...draft, max: e.target.value })}
                placeholder="none"
              />
            </Field>
            <Field label="Priority">
              <input
                className="zx-input"
                inputMode="numeric"
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
              />
            </Field>
            <Field label="Active">
              <select
                className="zx-input"
                value={draft.is_active ? "1" : "0"}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.value === "1" })}
              >
                <option value="1">Active</option>
                <option value="0">Paused</option>
              </select>
            </Field>
            <Field label="Starts">
              <input
                type="date"
                className="zx-input"
                value={draft.starts_at}
                onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })}
              />
            </Field>
            <Field label="Ends">
              <input
                type="date"
                className="zx-input"
                value={draft.ends_at}
                onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
              />
            </Field>
          </div>

          <div className="rounded p-3" style={{ background: "rgba(0,200,83,0.07)" }}>
            <div className="flex items-center gap-2">
              <span className="mono-tag text-[10px] opacity-60">PREVIEW ON {ruleCurrency}</span>
              <input
                className="zx-input w-24"
                inputMode="decimal"
                step={inputStep(ruleCurrency)}
                value={preview}
                onChange={(e) => setPreview(e.target.value)}
              />
            </div>
            {(() => {
              const s = computeSplit(previewGross, {
                id: "preview",
                label: draft.label,
                kind: draft.kind,
                scope: draft.scope,
                scope_value: draft.scope_value,
                percent_bps: Math.round((parseFloat(draft.percent || "0") || 0) * 100),
                fixed_cents: minor(draft.fixed, ruleCurrency),
                min_fee_cents: minor(draft.min, ruleCurrency),
                max_fee_cents: draft.max ? minor(draft.max, ruleCurrency) : null,
                currency: null,
                priority: 0,
                starts_at: null,
                ends_at: null,
                is_active: true,
              });
              return (
                <p className="mt-2 text-[12px]">
                  You keep{" "}
                  <strong style={{ color: "#00c853" }}>{formatMoney(s.platform_fee_cents)}</strong>{" "}
                  · seller receives <strong>{formatMoney(s.net_cents)}</strong> (
                  {(s.fee_bps / 100).toFixed(2)}% effective)
                </p>
              );
            })()}
          </div>

          <div className="flex gap-2">
            <button className="btn-solid flex-1" disabled={busy} onClick={submit}>
              {busy ? "Saving…" : "Save rule"}
            </button>
            <button className="btn-ghost flex-1" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {rules.isLoading && <p className="text-sm opacity-60">Loading rules…</p>}
      <div className="space-y-2">
        {list.map((r) => (
          <div key={r.id} className="card-surface flex items-start justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm">{r.label}</p>
              <p className="mono-tag mt-1 text-[10px] opacity-60">
                {r.kind} · {r.scope}
                {r.scope_value ? `:${r.scope_value}` : ""} · {describeRule(r)}
                {!r.is_active && " · PAUSED"}
              </p>
            </div>
            {canWrite && (
              <div className="flex shrink-0 gap-1">
                <button className="btn-ghost text-[10px]" onClick={() => setDraft(toDraft(r))}>
                  Edit
                </button>
                {r.scope !== "default" && (
                  <button
                    className="btn-ghost text-[10px]"
                    style={{ color: "var(--color-heat)" }}
                    onClick={() => del(r.id)}
                  >
                    Del
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mono-tag text-[10px] opacity-60">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
