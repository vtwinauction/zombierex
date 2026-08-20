ALTER TABLE public.payout_batches ADD COLUMN IF NOT EXISTS totals jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_batch_seller_currency
  ON public.payouts (batch_id, seller_id, currency)
  WHERE status IN ('scheduled', 'processing', 'paid');

CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_batches_period
  ON public.payout_batches (period_start, period_end);