-- ============================================================================
-- Protect privileged profile fields (role, company_id, is_active, email)
-- ============================================================================
-- Problem fixed:
--   1. The "Users can update their own profile" policy let any signed-in user
--      change their OWN role / company_id (e.g. make themselves platform_admin
--      or move into another company).
--   2. "admins_can_update_user_roles" let a workspace_admin update profiles in
--      ANY company, not just their own.
--
-- After this migration:
--   - Users can still edit their own name, phone, theme, etc.
--   - Only these can change role / company_id / is_active / email:
--       * server code using the service role key (edge functions, backend, SQL editor)
--       * a platform_admin
--       * a workspace_admin, for OTHER members of THEIR OWN company, assigning
--         viewer / operator / ml_engineer / workspace_admin, or removing them
--         from the company (company_id -> NULL)
-- ============================================================================

-- Helpers that read the caller's own profile without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_profile_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- 1) Trigger: block privileged field changes by normal users
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT := COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
  caller_role TEXT;
  caller_company UUID;
BEGIN
  -- Trusted server-side callers: service role key, SQL editor, other triggers
  IF auth.uid() IS NULL OR jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A user may only create a blank profile for themselves
    NEW.role := NULL;
    NEW.company_id := NULL;
    NEW.is_active := TRUE;
    RETURN NEW;
  END IF;

  -- Normal profile edits (name, phone, theme, ...) are always fine
  IF NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.company_id IS NOT DISTINCT FROM OLD.company_id
     AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active
     AND NEW.email IS NOT DISTINCT FROM OLD.email THEN
    RETURN NEW;
  END IF;

  SELECT role, company_id INTO caller_role, caller_company
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role = 'platform_admin' THEN
    RETURN NEW;
  END IF;

  IF caller_role IN ('workspace_admin', 'admin')
     AND OLD.id <> auth.uid()                                   -- not on themselves
     AND OLD.company_id IS NOT NULL
     AND OLD.company_id = caller_company                        -- member of their own company
     AND COALESCE(OLD.role, '') <> 'platform_admin'             -- can't touch platform admins
     AND NEW.email IS NOT DISTINCT FROM OLD.email               -- email only via server
     AND (NEW.company_id IS NOT DISTINCT FROM OLD.company_id    -- stay in company...
          OR NEW.company_id IS NULL)                            -- ...or be removed from it
     AND (NEW.role IS NULL
          OR NEW.role IN ('viewer', 'operator', 'ml_engineer', 'workspace_admin')) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to change role, company, login access or email of this profile'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- ----------------------------------------------------------------------------
-- 2) Replace the over-broad admin update policies with a company-scoped one
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "admins_can_update_user_roles" ON public.profiles;
DROP POLICY IF EXISTS "workspace_admin_can_update_roles_in_company" ON public.profiles;
DROP POLICY IF EXISTS "admins_update_profiles_in_own_company" ON public.profiles;

CREATE POLICY "admins_update_profiles_in_own_company"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.current_profile_role() = 'platform_admin'
  OR (
    public.current_profile_role() IN ('workspace_admin', 'admin')
    AND company_id = public.current_profile_company_id()
  )
)
WITH CHECK (
  public.current_profile_role() = 'platform_admin'
  OR (
    public.current_profile_role() IN ('workspace_admin', 'admin')
    AND (company_id = public.current_profile_company_id() OR company_id IS NULL)
  )
);
