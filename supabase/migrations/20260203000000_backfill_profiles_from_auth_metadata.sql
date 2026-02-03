-- ============================================================================
-- Backfill profiles.name and profiles.phone from auth.users.raw_user_meta_data
-- ============================================================================
-- This migration copies name and phone from auth.users metadata to profiles table
-- for existing users where profiles.name or profiles.phone is NULL

UPDATE public.profiles p
SET 
  name = COALESCE(
    NULLIF(p.name, ''),  -- Keep existing name if not empty
    (SELECT (raw_user_meta_data->>'name')::TEXT 
     FROM auth.users 
     WHERE id = p.id)
  ),
  phone = COALESCE(
    NULLIF(p.phone, ''),  -- Keep existing phone if not empty
    (SELECT (raw_user_meta_data->>'phone')::TEXT 
     FROM auth.users 
     WHERE id = p.id)
  )
WHERE 
  -- Only update profiles where name or phone is NULL or empty
  (p.name IS NULL OR p.name = '')
  OR (p.phone IS NULL OR p.phone = '')
  -- And auth.users has the metadata
  AND EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = p.id 
    AND (
      raw_user_meta_data->>'name' IS NOT NULL 
      OR raw_user_meta_data->>'phone' IS NOT NULL
    )
  );
