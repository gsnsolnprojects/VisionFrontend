-- ============================================================================
-- Billing Phase 2: remember when a subscription is set to cancel
-- ============================================================================
-- When an admin cancels, Razorpay keeps the subscription active until the end
-- of the month that is already paid for, then cancels it. This flag lets the
-- Billing page show "Cancels on <date>" in the meantime.
-- ============================================================================

ALTER TABLE public.company_subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;
