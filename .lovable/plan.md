## Goal

Turn ZOMBIEREX from "no commission anywhere" into a marketplace where every completed transaction automatically splits into a platform cut and a seller payout, with all rates, fees, and payment rules controlled from an owner/admin panel — no redeploys.

## Phase 1 — Money ledger (database)

New tables (all with GRANTs + RLS, owner/admin-only reads except the seller's own rows):

- `fee_rules` — the configurable commission engine. Columns: scope (`default` | `category` | `seller` | `country` | `seller_type` | `promo`), scope_value, `percent_bps`, `fixed_cents`, `min_fee_cents`, `max_fee_cents`, currency, priority, `starts_at`/`ends_at`, active. Most specific active rule wins; ties broken by priority.
- `transactions` — the single financial record for every money event (order, tip, creator sub, plan, ad). Gross, fee, net, processor fee, currency, buyer, seller, provider, provider_ref, status, refunded amount. Immutable-by-users; written by server only.
- `ledger_entries` — double-entry lines (debit/credit, account: platform_revenue / seller_payable / processor_fees / refunds) so every dollar reconciles.
- `payout_batches` + `payouts` — seller balance, scheduled settlement, status, provider transfer ref.
- `refunds` — amount, reason, whether commission is clawed back, actor.
- `payment_config` — gateway toggles, enabled methods, currencies, tax rules, service fees, refund window, withdrawal minimum/limits, settlement schedule. Single JSON-ish keyed table, read at request time.
- Extend `payments` and `orders` with `platform_fee_cents`, `net_cents`, `fee_bps`, `transaction_id`.
- `financial_audit_log` — every admin change to fees/config/refunds (actor, before, after, ip). Existing `tg_audit_row` trigger reused.

Idempotency: unique index on `(provider, provider_ref)` in `transactions` to hard-block duplicate payment application.

## Phase 2 — Commission engine (server)

`src/lib/commission.server.ts`
- `resolveFeeRule({ category, sellerId, sellerType, country, currency, at })` → the winning rule.
- `computeSplit(grossCents, rule)` → `{ fee_cents, net_cents, applied_rule_id }`, clamped by min/max, supporting percent, fixed, or percent+fixed.
- Pure functions, unit-tested with vitest (rounding, clamps, promo windows, zero/negative guards).

`src/lib/finance.server.ts`
- `settleTransaction()` — called from the payment webhook only. Computes split, writes `transactions` + `ledger_entries`, credits seller payable, flips order to paid, fires buyer/seller notifications and receipt emails.
- `refundTransaction()` — reverses ledger lines, optional commission clawback per config.

All of this runs behind the existing `/api/public/webhooks/payments` route and new server functions in `src/lib/finance.functions.ts`.

## Phase 3 — Admin/owner control plane (UI)

New routes under `_authenticated/owner/` (role-gated by `has_any_role(owner, super_admin, admin)`, with finance actions restricted to owner/super_admin):

- `/owner/finance` — revenue dashboard: total / today / MTD / YTD revenue, commissions earned, GMV, avg commission per transaction, counts of successful, pending, failed, refunded. Recharts line + bar charts, CSV export.
- `/owner/finance/commissions` — CRUD for `fee_rules`: default, per-category, per-seller, per-country, promo campaigns, min/max, fixed + percent. Live preview ("a $100 sale in Parts by seller X yields $5.00 to you"). Changes apply on the next transaction, no deploy.
- `/owner/finance/payments` — gateway config, enabled methods, currencies, tax, service fees, refund rules, withdrawal rules, settlement schedule.
- `/owner/finance/transactions` — searchable, filterable table (date, seller, buyer, method, status), row drawer with ledger lines, actions: refund, cancel, adjust commission (audited), export CSV.
- `/owner/finance/sellers` — approve/suspend, custom commission rate, earnings, payouts, withdrawal limits, payout schedule.
- `/owner/finance/buyers` — purchase and payment history, disputes, refunds.

Seller-facing: extend the existing payouts ledger to show gross, commission, and net per sale, plus pending balance and next payout date.

## Phase 4 — Automation

- Settlement on webhook success (already the seam).
- pg_cron → `/api/public/hooks/run-payouts` for scheduled payout batches.
- pg_cron → `/api/public/hooks/finance-digest` for daily owner revenue email.
- Auto invoice/receipt records + emails on settlement and refund via existing email templates.
- Notifications to buyer and seller on paid, shipped, refunded, payout sent.

## Phase 5 — Real money

The engine above works against the current mock provider end to end. To actually charge cards and move funds to you and to sellers, Stripe must be enabled (Paddle can't sell physical goods, which your marketplace does). Split payouts to sellers need Stripe Connect onboarding. I'll wire the provider adapter behind a `PaymentProvider` interface so adding gateways later is a new file, not a refactor.

## Technical notes

- Fee math in integer cents only; banker-safe rounding, fee never exceeds gross.
- Every fee-affecting read goes through one resolver, so rate changes are instant and consistent.
- Indexes on `transactions(created_at)`, `(seller_id, status)`, `(provider, provider_ref)` for volume.
- Provider adapters isolated in `src/lib/payments/providers/*` — modular for future gateways.
- Owner-only RLS on all finance tables; admin sees read-only unless granted.
- Unit tests for the commission engine; Playwright smoke test for the owner finance dashboard.

## Defaults I'll seed (changeable in the panel)

Marketplace 5%, creator tips 10%, creator subscriptions 15%, vendor/premium plans 100% (your own SaaS), ads 100%. Minimum fee $0.30, no maximum.

## Scope note

This is a large build. I'll ship it in the phase order above so each phase is usable on its own — the ledger and engine first, then the admin panel, then automation.
