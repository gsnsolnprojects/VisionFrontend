-- ============================================================================
-- Projects need an active plan, within the plan's project limit
-- ============================================================================
-- Projects are created straight from the browser (Supabase client), so the
-- backend's plan guard can't see them. This trigger applies the same rule as
-- getCompanyAccess() in VisionBackend/utils/plans.js:
--   - unlimited access (is_unlimited)            -> always allowed
--   - status 'active' and period not ended       -> allowed up to the plan limit
--   - anything else (no plan, lapsed, cancelled) -> blocked
-- Plan limits (keep in step with utils/plans.js): playground 1, pilot 1, production 3.
-- Server code (service role) and the SQL editor are not limited.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_project_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT := COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
  sub public.company_subscriptions%ROWTYPE;
  project_limit INTEGER;
  existing_projects INTEGER;
BEGIN
  IF auth.uid() IS NULL OR jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO sub FROM public.company_subscriptions WHERE company_id = NEW.company_id;

  IF FOUND AND sub.is_unlimited THEN
    RETURN NEW;
  END IF;

  IF NOT FOUND
     OR sub.plan IS NULL
     OR sub.status <> 'active'
     OR (sub.current_period_end IS NOT NULL AND sub.current_period_end <= NOW()) THEN
    RAISE EXCEPTION 'Your workspace needs an active plan to create projects. Choose a plan in Settings → Billing.'
      USING ERRCODE = 'P0001';
  END IF;

  project_limit := CASE sub.plan
    WHEN 'playground' THEN 1
    WHEN 'pilot' THEN 1
    WHEN 'production' THEN 3
  END;

  SELECT count(*) INTO existing_projects FROM public.projects WHERE company_id = NEW.company_id;

  IF project_limit IS NOT NULL AND existing_projects >= project_limit THEN
    RAISE EXCEPTION 'Your plan includes % project(s). Upgrade in Settings → Billing for more.', project_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_project_plan_limit ON public.projects;
CREATE TRIGGER enforce_project_plan_limit
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_plan_limit();
