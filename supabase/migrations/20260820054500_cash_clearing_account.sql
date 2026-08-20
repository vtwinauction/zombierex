-- Double-entry: settlements and refunds need a cash/clearing counter-account so
-- SUM(debits) = SUM(credits) per transaction and a trial balance is possible.
ALTER TYPE public.ledger_account ADD VALUE IF NOT EXISTS 'cash_clearing';
