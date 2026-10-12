-- ============================================================================
-- Test for migration 20261012000000_protect_profile_privileged_fields.sql
-- Run in the Supabase SQL Editor AFTER applying the migration.
-- Every change a test makes is undone, so it is safe to run on live data.
-- Each row shows what should happen ("expected") and what did happen ("actual").
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS profile_protection_results (n INT, test TEXT, expected TEXT, actual TEXT);
TRUNCATE profile_protection_results;

DO $$
DECLARE
  -- A viewer in gsn, another gsn member, and the platform admin
  viewer_id UUID := (SELECT id FROM public.profiles WHERE email = 'gsnsolnprojects@gmail.com');
  other_id  UUID := (SELECT id FROM public.profiles WHERE email = 'sanskrutinm1506@gmail.com');
  admin_id  UUID := (SELECT id FROM public.profiles WHERE role = 'platform_admin' LIMIT 1);
  outcome TEXT;
  changed INT;
BEGIN
  -- 1) Viewer tries to make himself platform_admin
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', viewer_id, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    UPDATE public.profiles SET role = 'platform_admin' WHERE id = viewer_id;
    RAISE EXCEPTION '__undo__';
  EXCEPTION WHEN OTHERS THEN
    outcome := CASE WHEN SQLERRM = '__undo__' THEN 'ALLOWED' WHEN SQLSTATE = '42501' THEN 'BLOCKED' ELSE 'ERROR: ' || SQLERRM END;
  END;
  INSERT INTO profile_protection_results VALUES (1, 'Viewer makes himself platform_admin', 'BLOCKED', outcome);

  -- 2) Viewer tries to move himself to another company
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', viewer_id, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    UPDATE public.profiles SET company_id = gen_random_uuid() WHERE id = viewer_id;
    RAISE EXCEPTION '__undo__';
  EXCEPTION WHEN OTHERS THEN
    outcome := CASE WHEN SQLERRM = '__undo__' THEN 'ALLOWED' WHEN SQLSTATE IN ('42501', '23503') THEN 'BLOCKED' ELSE 'ERROR: ' || SQLERRM END;
  END;
  INSERT INTO profile_protection_results VALUES (2, 'Viewer moves himself to another company', 'BLOCKED', outcome);

  -- 3) Viewer tries to change his email (used for admin and invite checks)
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', viewer_id, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    UPDATE public.profiles SET email = 'someone-else@example.com' WHERE id = viewer_id;
    RAISE EXCEPTION '__undo__';
  EXCEPTION WHEN OTHERS THEN
    outcome := CASE WHEN SQLERRM = '__undo__' THEN 'ALLOWED' WHEN SQLSTATE = '42501' THEN 'BLOCKED' ELSE 'ERROR: ' || SQLERRM END;
  END;
  INSERT INTO profile_protection_results VALUES (3, 'Viewer changes his own email', 'BLOCKED', outcome);

  -- 4) Viewer tries to change another member's role
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', viewer_id, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    UPDATE public.profiles SET role = 'viewer' WHERE id = other_id;
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed = 0 THEN RAISE EXCEPTION '__norows__'; END IF;
    RAISE EXCEPTION '__undo__';
  EXCEPTION WHEN OTHERS THEN
    outcome := CASE WHEN SQLERRM = '__undo__' THEN 'ALLOWED' WHEN SQLERRM = '__norows__' OR SQLSTATE = '42501' THEN 'BLOCKED' ELSE 'ERROR: ' || SQLERRM END;
  END;
  INSERT INTO profile_protection_results VALUES (4, 'Viewer changes another member''s role', 'BLOCKED', outcome);

  -- 5) Viewer edits his own phone number (normal profile edit)
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', viewer_id, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    UPDATE public.profiles SET phone = phone WHERE id = viewer_id;
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed = 0 THEN RAISE EXCEPTION '__norows__'; END IF;
    RAISE EXCEPTION '__undo__';
  EXCEPTION WHEN OTHERS THEN
    outcome := CASE WHEN SQLERRM = '__undo__' THEN 'ALLOWED' WHEN SQLERRM = '__norows__' OR SQLSTATE = '42501' THEN 'BLOCKED' ELSE 'ERROR: ' || SQLERRM END;
  END;
  INSERT INTO profile_protection_results VALUES (5, 'Viewer edits his own phone number', 'ALLOWED', outcome);

  -- 6) Platform admin changes the viewer's role to operator
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    UPDATE public.profiles SET role = 'operator' WHERE id = viewer_id;
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed = 0 THEN RAISE EXCEPTION '__norows__'; END IF;
    RAISE EXCEPTION '__undo__';
  EXCEPTION WHEN OTHERS THEN
    outcome := CASE WHEN SQLERRM = '__undo__' THEN 'ALLOWED' WHEN SQLERRM = '__norows__' OR SQLSTATE = '42501' THEN 'BLOCKED' ELSE 'ERROR: ' || SQLERRM END;
  END;
  INSERT INTO profile_protection_results VALUES (6, 'Platform admin changes a member''s role', 'ALLOWED', outcome);
END $$;

SELECT n, test, expected, actual,
       CASE WHEN expected = actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM profile_protection_results
ORDER BY n;
