-- ============================================================================
-- Update get_join_request_user_info to fallback to auth.users metadata
-- ============================================================================
-- This function now checks profiles first, then falls back to auth.users metadata
-- if profile name/phone is NULL or empty

CREATE OR REPLACE FUNCTION public.get_join_request_user_info(request_user_id UUID)
RETURNS TABLE(
  name TEXT,
  email TEXT,
  phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return user name, email, and phone from profiles table
  -- Fallback to auth.users metadata if profile fields are NULL or empty
  RETURN QUERY
  SELECT 
    COALESCE(
      NULLIF(TRIM(p.name), ''),  -- Use profile name if not empty
      (SELECT (raw_user_meta_data->>'name')::TEXT 
       FROM auth.users 
       WHERE id = request_user_id),
      ''  -- Fallback to empty string if nothing found
    ) AS name,
    COALESCE(
      NULLIF(TRIM(p.email), ''),  -- Use profile email if not empty
      (SELECT email::TEXT 
       FROM auth.users 
       WHERE id = request_user_id),
      ''  -- Fallback to empty string if nothing found
    ) AS email,
    COALESCE(
      NULLIF(TRIM(p.phone), ''),  -- Use profile phone if not empty
      (SELECT (raw_user_meta_data->>'phone')::TEXT 
       FROM auth.users 
       WHERE id = request_user_id),
      ''  -- Fallback to empty string if nothing found
    ) AS phone
  FROM public.profiles p
  WHERE p.id = request_user_id
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_join_request_user_info(UUID) TO authenticated;

-- Update comment
COMMENT ON FUNCTION public.get_join_request_user_info(UUID) IS 
  'Allows admins to view user name, email, and phone for pending join requests. Checks profiles table first, then falls back to auth.users metadata if profile fields are NULL or empty. Bypasses RLS to enable viewing user info even when user is not yet a company member.';
