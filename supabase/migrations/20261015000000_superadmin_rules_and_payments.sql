-- ============================================================================
-- Superadmin (platform_admin) rules + payment history
-- ============================================================================
-- 1. Deleting a user no longer deletes what they created.
--    companies / projects / datasets / invites had created_by ... ON DELETE CASCADE,
--    so deleting the user who created a company silently deleted the whole company.
--    These now become ON DELETE SET NULL (the record stays, "created by" goes blank).
--
-- 2. Exactly one superadmin:
--    - at most one profile can have role = 'platform_admin'
--    - it must belong to the company named "gsn"
--    - it can't be deactivated
--    - from the app, nobody can take the role away (only the SQL editor / service role)
--
-- 3. The "gsn" company can't be renamed or deleted (a second "gsn" is already
--    blocked by idx_companies_name_lower_unique).
--
-- 4. subscription_payments: one row per successful Razorpay charge, written by the
--    backend webhook (service role). Only the platform admin can read it.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) created_by / invited_by -> ON DELETE SET NULL
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.profiles'::regclass
      AND a.attname IN ('created_by', 'invited_by')
      AND c.confdeltype = 'c' -- currently ON DELETE CASCADE
  LOOP
    EXECUTE format('ALTER TABLE %s ALTER COLUMN %I DROP NOT NULL', r.tbl, r.col);
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE SET NULL',
      r.tbl, r.conname, r.col
    );
    RAISE NOTICE 'Changed %.% to ON DELETE SET NULL', r.tbl, r.col;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2) Only one platform_admin, in the gsn company
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_single_platform_admin
  ON public.profiles ((role))
  WHERE role = 'platform_admin';

CREATE OR REPLACE FUNCTION public.enforce_platform_admin_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT := COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
  trusted BOOLEAN := auth.uid() IS NULL OR jwt_role = 'service_role';
BEGIN
  IF NEW.role = 'platform_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = NEW.company_id AND lower(trim(name)) = 'gsn'
    ) THEN
      RAISE EXCEPTION 'The platform admin must belong to the gsn company'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.is_active IS FALSE THEN
      RAISE EXCEPTION 'The platform admin account cannot be deactivated'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- From the app, nobody (not even the platform admin) can remove the role
  IF TG_OP = 'UPDATE'
     AND OLD.role = 'platform_admin'
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NOT trusted THEN
    RAISE EXCEPTION 'The platform admin role can only be changed by GSN from the database'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_platform_admin_rules ON public.profiles;
CREATE TRIGGER enforce_platform_admin_rules
  BEFORE INSERT OR UPDATE OF role, company_id, is_active ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_platform_admin_rules();

-- ----------------------------------------------------------------------------
-- 3) The gsn company can't be renamed or deleted
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_gsn_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF lower(trim(OLD.name)) = 'gsn' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'The gsn company cannot be deleted' USING ERRCODE = '42501';
    END IF;
    IF lower(trim(NEW.name)) <> 'gsn' THEN
      RAISE EXCEPTION 'The gsn company cannot be renamed' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS protect_gsn_company ON public.companies;
CREATE TRIGGER protect_gsn_company
  BEFORE UPDATE OF name OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_gsn_company();

-- ----------------------------------------------------------------------------
-- 4) Payment history (written only by the backend webhook)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  razorpay_payment_id      TEXT PRIMARY KEY,
  company_id               UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name             TEXT,          -- kept so history survives a company being deleted
  razorpay_subscription_id TEXT,
  plan                     TEXT,
  amount_paise             INTEGER NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'INR',
  status                   TEXT NOT NULL,
  paid_at                  TIMESTAMPTZ NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_paid_at
  ON public.subscription_payments (paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_company
  ON public.subscription_payments (company_id);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Read-only for the platform admin; no INSERT / UPDATE / DELETE policies on purpose
DROP POLICY IF EXISTS "platform_admin_reads_payments" ON public.subscription_payments;
CREATE POLICY "platform_admin_reads_payments"
ON public.subscription_payments
FOR SELECT
TO authenticated
USING (public.current_profile_role() = 'platform_admin');

-- ============================================================================
-- Checks after applying:
--   SELECT conrelid::regclass, conname, confdeltype FROM pg_constraint
--   WHERE confrelid = 'public.profiles'::regclass AND contype = 'f';
--     -> created_by / invited_by rows show confdeltype 'n' (SET NULL)
--   SELECT count(*) FROM public.profiles WHERE role = 'platform_admin';  -> 1
-- ============================================================================
