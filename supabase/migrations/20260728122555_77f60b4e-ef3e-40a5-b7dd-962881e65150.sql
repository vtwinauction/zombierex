
-- =====================================================================
-- ZOMBIEREX Financial Core
-- =====================================================================

CREATE TYPE public.fee_scope AS ENUM ('default','category','seller','seller_type','country','promo');
CREATE TYPE public.txn_kind AS ENUM ('order','tip','creator_subscription','plan','ad','other');
CREATE TYPE public.txn_status AS ENUM ('pending','succeeded','failed','refunded','partially_refunded','cancelled');
CREATE TYPE public.ledger_account AS ENUM ('platform_revenue','seller_payable','processor_fees','refunds','tax_payable');
CREATE TYPE public.payout_status AS ENUM ('scheduled','processing','paid','failed','cancelled');

-- ---------------------------------------------------------------- fee_rules
CREATE TABLE public.fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  kind public.txn_kind NOT NULL DEFAULT 'order',
  scope public.fee_scope NOT NULL DEFAULT 'default',
  scope_value text,
  percent_bps integer NOT NULL DEFAULT 0,
  fixed_cents integer NOT NULL DEFAULT 0,
  min_fee_cents integer NOT NULL DEFAULT 0,
  max_fee_cents integer,
  currency text,
  priority integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fee_rules_percent_chk CHECK (percent_bps >= 0 AND percent_bps <= 10000),
  CONSTRAINT fee_rules_fixed_chk CHECK (fixed_cents >= 0),
  CONSTRAINT fee_rules_min_chk CHECK (min_fee_cents >= 0),
  CONSTRAINT fee_rules_max_chk CHECK (max_fee_cents IS NULL OR max_fee_cents >= min_fee_cents),
  CONSTRAINT fee_rules_scope_value_chk CHECK (scope = 'default' OR scope_value IS NOT NULL)
);
CREATE INDEX idx_fee_rules_lookup ON public.fee_rules (kind, scope, scope_value) WHERE is_active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_rules TO authenticated;
GRANT ALL ON public.fee_rules TO service_role;
ALTER TABLE public.fee_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY fee_rules_staff_read ON public.fee_rules FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','super_admin','admin']::app_role[]));
CREATE POLICY fee_rules_owner_write ON public.fee_rules FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','super_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','super_admin']::app_role[]));

-- ---------------------------------------------------------------- transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.txn_kind NOT NULL,
  status public.txn_status NOT NULL DEFAULT 'pending',
  buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  currency text NOT NULL DEFAULT 'USD',
  gross_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  processor_fee_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  net_cents integer NOT NULL DEFAULT 0,
  refunded_cents integer NOT NULL DEFAULT 0,
  fee_rule_id uuid REFERENCES public.fee_rules(id) ON DELETE SET NULL,
  fee_bps integer NOT NULL DEFAULT 0,
  category text,
  country text,
  provider text NOT NULL DEFAULT 'mock',
  provider_ref text,
  payment_method text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transactions_gross_chk CHECK (gross_cents >= 0),
  CONSTRAINT transactions_fee_chk CHECK (platform_fee_cents >= 0 AND platform_fee_cents <= gross_cents),
  CONSTRAINT transactions_refund_chk CHECK (refunded_cents >= 0 AND refunded_cents <= gross_cents)
);
CREATE UNIQUE INDEX idx_transactions_provider_ref ON public.transactions (provider, provider_ref)
  WHERE provider_ref IS NOT NULL;
CREATE INDEX idx_transactions_created ON public.transactions (created_at DESC);
CREATE INDEX idx_transactions_seller ON public.transactions (seller_id, status);
CREATE INDEX idx_transactions_buyer ON public.transactions (buyer_id, status);
CREATE INDEX idx_transactions_status ON public.transactions (status, created_at DESC);

GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY transactions_staff_read ON public.transactions FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','super_admin','admin']::app_role[]));
CREATE POLICY transactions_party_read ON public.transactions FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- ---------------------------------------------------------------- ledger_entries
CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  account public.ledger_account NOT NULL,
  party_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('debit','credit')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_txn ON public.ledger_entries (transaction_id);
CREATE INDEX idx_ledger_account ON public.ledger_entries (account, created_at DESC);
CREATE INDEX idx_ledger_party ON public.ledger_entries (party_id, account);

GRANT SELECT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY ledger_staff_read ON public.ledger_entries FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','super_admin','admin']::app_role[]));
CREATE POLICY ledger_party_read ON public.ledger_entries FOR SELECT TO authenticated
  USING (party_id = auth.uid());

-- ---------------------------------------------------------------- refunds
CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  reason text,
  reclaim_commission boolean NOT NULL DEFAULT true,
  commission_returned_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'succeeded',
  provider_ref text,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_refunds_txn ON public.refunds (transaction_id);

GRANT SELECT ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY refunds_staff_read ON public.refunds FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','super_admin','admin']::app_role[]));
CREATE POLICY refunds_party_read ON public.refunds FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transactions t
                 WHERE t.id = transaction_id AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())));

-- ---------------------------------------------------------------- payouts
CREATE TABLE public.payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  status public.payout_status NOT NULL DEFAULT 'scheduled',
  total_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payouts_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payout_batches TO authenticated;
GRANT ALL ON public.payout_batches TO service_role;
ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY payout_batches_staff_read ON public.payout_batches FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','super_admin','admin']::app_role[]));

CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.payout_batches(id) ON DELETE SET NULL,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  status public.payout_status NOT NULL DEFAULT 'scheduled',
  method text,
  provider_ref text,
  scheduled_for timestamptz,
  paid_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payouts_seller ON public.payouts (seller_id, status);
CREATE INDEX idx_payouts_batch ON public.payouts (batch_id);

GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY payouts_staff_read ON public.payouts FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','super_admin','admin']::app_role[]));
CREATE POLICY payouts_self_read ON public.payouts FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

-- ---------------------------------------------------------------- seller_finance_settings
CREATE TABLE public.seller_finance_settings (
  seller_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved boolean NOT NULL DEFAULT false,
  suspended boolean NOT NULL DEFAULT false,
  seller_type text NOT NULL DEFAULT 'standard',
  min_withdrawal_cents integer NOT NULL DEFAULT 2500,
  max_withdrawal_cents integer,
  payout_schedule text NOT NULL DEFAULT 'weekly',
  payout_method text,
  payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seller_finance_settings TO authenticated;
GRANT ALL ON public.seller_finance_settings TO service_role;
ALTER TABLE public.seller_finance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY sfs_staff_read ON public.seller_finance_settings FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','super_admin','admin']::app_role[]));
CREATE POLICY sfs_self_read ON public.seller_finance_settings FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

-- ---------------------------------------------------------------- payment_config
CREATE TABLE public.payment_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_config TO authenticated;
GRANT ALL ON public.payment_config TO service_role;
ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_config_staff_read ON public.payment_config FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','super_admin','admin']::app_role[]));

-- ---------------------------------------------------------------- financial_audit_log
CREATE TABLE public.financial_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_kind text,
  target_id uuid,
  before_state jsonb,
  after_state jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fin_audit_created ON public.financial_audit_log (created_at DESC);
GRANT SELECT ON public.financial_audit_log TO authenticated;
GRANT ALL ON public.financial_audit_log TO service_role;
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_audit_staff_read ON public.financial_audit_log FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','super_admin','admin']::app_role[]));

-- ---------------------------------------------------------------- extend existing
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_bps integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_ref
  ON public.payments (provider, provider_ref) WHERE provider_ref IS NOT NULL;

-- ---------------------------------------------------------------- triggers
CREATE TRIGGER trg_fee_rules_updated BEFORE UPDATE ON public.fee_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payouts_updated BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payout_batches_updated BEFORE UPDATE ON public.payout_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sfs_updated BEFORE UPDATE ON public.seller_finance_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER zrx_audit_fee_rules AFTER INSERT OR UPDATE OR DELETE ON public.fee_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER zrx_audit_payment_config AFTER INSERT OR UPDATE OR DELETE ON public.payment_config
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER zrx_audit_refunds AFTER INSERT OR UPDATE OR DELETE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ---------------------------------------------------------------- seeds
INSERT INTO public.fee_rules (label, kind, scope, percent_bps, fixed_cents, min_fee_cents, priority)
VALUES
  ('Default marketplace commission', 'order', 'default', 500, 0, 30, 0),
  ('Default creator tip commission', 'tip', 'default', 1000, 0, 30, 0),
  ('Default creator subscription commission', 'creator_subscription', 'default', 1500, 0, 30, 0),
  ('Platform plans (no split)', 'plan', 'default', 0, 0, 0, 0),
  ('Ad spend (no split)', 'ad', 'default', 0, 0, 0, 0);

INSERT INTO public.payment_config (key, value, description) VALUES
  ('gateways', '{"stripe":{"enabled":false,"mode":"sandbox"},"paddle":{"enabled":false,"mode":"sandbox"},"mock":{"enabled":true}}'::jsonb, 'Payment gateway toggles'),
  ('methods', '{"card":true,"apple_pay":false,"google_pay":false,"bank_transfer":false,"wallet":false}'::jsonb, 'Enabled payment methods'),
  ('currencies', '{"default":"USD","supported":["USD","EUR","GBP","AED","SAR"]}'::jsonb, 'Supported currencies'),
  ('tax', '{"mode":"none","default_rate_bps":0,"inclusive":false}'::jsonb, 'Tax configuration'),
  ('service_fees', '{"buyer_fee_bps":0,"buyer_fee_fixed_cents":0}'::jsonb, 'Buyer-side service fees'),
  ('refunds', '{"window_days":30,"allow_partial":true,"reclaim_commission":true}'::jsonb, 'Refund rules'),
  ('withdrawals', '{"min_cents":2500,"max_cents":null,"hold_days":7}'::jsonb, 'Withdrawal rules'),
  ('settlement', '{"schedule":"weekly","day_of_week":1,"auto_payout":false}'::jsonb, 'Settlement schedule');
