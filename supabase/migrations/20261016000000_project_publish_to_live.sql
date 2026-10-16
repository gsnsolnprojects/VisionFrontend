-- ============================================================================
-- Projects: "publish to live" switch
-- ============================================================================
-- The local and live (AWS) setups share this database. The live site only shows
-- projects with publish_to_live = true; the local setup shows every project.
-- Existing and new projects start published.
--
-- Only server code (the backend's service role key, or the SQL editor) can change
-- the switch: the superadmin flips it in Superadmin -> Publish to live, through
-- the backend. Company members can still edit a project's name and description.
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS publish_to_live BOOLEAN NOT NULL DEFAULT TRUE;

CREATE OR REPLACE FUNCTION public.protect_project_publish_to_live()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT := COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
BEGIN
  -- Server code (service role) and the SQL editor (no JWT) may change it
  IF jwt_role = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.publish_to_live := TRUE; -- projects created in the app always start published
  ELSIF NEW.publish_to_live IS DISTINCT FROM OLD.publish_to_live THEN
    RAISE EXCEPTION 'Only the GSN superadmin can change whether a project is published';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_project_publish_to_live ON public.projects;
CREATE TRIGGER protect_project_publish_to_live
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_project_publish_to_live();
