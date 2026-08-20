-- ZOMBIEREX · hold-period groundwork
--
-- `escrow_held` is added now so the hold-period work has an account to move
-- funds into without a second enum change. Postgres forbids USING a new enum
-- value in the same transaction that adds it, which is why this migration adds
-- the value and documents intent, and nothing else writes to it yet.
ALTER TYPE public.ledger_account ADD VALUE IF NOT EXISTS 'escrow_held';

COMMENT ON COLUMN public.payout_batches.totals IS
  'Per-currency totals, e.g. {"BHD": 125000, "USD": 4200}. Amounts are integer minor units and differ per currency — never sum across keys.';
COMMENT ON COLUMN public.payout_batches.total_cents IS
  'DEPRECATED for multi-currency use: platform-default currency only. Read totals instead.';