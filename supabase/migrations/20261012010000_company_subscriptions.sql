-- ============================================================================
-- Company subscriptions (Phase 1 of billing)
-- ============================================================================
-- One row per company holding its plan and payment status.
--   plan:   playground | pilot | production | NULL (no plan yet)
--   status: none | active | past_due | cancelled | expired
--   is_unlimited: internal switch (platform admins / SQL only) that gives a
--                 company full access without paying, for GSN's own testing.
--
-- Members can READ their own company's row. Nobody can write it from the
-- browser: only server code (service role key) and the SQL editor can, so a
-- plan can't be granted without paying. Razorpay columns are filled in Phase 2.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  company_id               UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  plan                     TEXT CHECK (plan IN ('playground', 'pilot', 'production')),
  status                   TEXT NOT NULL DEFAULT 'none'
                           CHECK (status IN ('none', 'active', 'past_due', 'cancelled', 'expired')),
  current_period_end       TIMESTAMPTZ,
  is_unlimited             BOOLEAN NOT NULL DEFAULT FALSE,
  razorpay_customer_id     TEXT,
  razorpay_subscription_id TEXT UNIQUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

-- Read-only access for members of the company (and platform admins).
-- There are deliberately no INSERT / UPDATE / DELETE policies.
DROP POLICY IF EXISTS "members_read_own_company_subscription" ON public.company_subscriptions;
CREATE POLICY "members_read_own_company_subscription"
ON public.company_subscriptions
FOR SELECT
TO authenticated
USING (
  company_id = public.current_profile_company_id()
  OR public.current_profile_role() = 'platform_admin'
);

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.touch_company_subscription_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_company_subscription_updated_at ON public.company_subscriptions;
CREATE TRIGGER touch_company_subscription_updated_at
  BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_company_subscription_updated_at();

-- Every new company starts with a "no plan" row
CREATE OR REPLACE FUNCTION public.create_company_subscription_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_subscriptions (company_id)
  VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_company_subscription_row ON public.companies;
CREATE TRIGGER create_company_subscription_row
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.create_company_subscription_row();

-- Rows for companies that already exist
INSERT INTO public.company_subscriptions (company_id)
SELECT id FROM public.companies
ON CONFLICT (company_id) DO NOTHING;

-- GSN's own workspace gets unlimited access for internal testing
UPDATE public.company_subscriptions
SET is_unlimited = TRUE
WHERE company_id IN (SELECT id FROM public.companies WHERE name = 'gsn');
