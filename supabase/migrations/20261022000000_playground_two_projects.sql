-- ============================================================================
-- Playground includes 2 projects (was 1)
-- ============================================================================
-- Same trigger function as 20261015010000_project_plan_limits.sql with the new
-- Playground limit. Keep in step with utils/plans.js in VisionBackend:
-- playground 2, pilot 1, production 3.
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
    WHEN 'playground' THEN 2
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
