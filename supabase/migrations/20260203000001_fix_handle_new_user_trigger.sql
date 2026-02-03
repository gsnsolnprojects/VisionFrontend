-- ============================================================================
-- Fix handle_new_user trigger to properly read raw_user_meta_data
-- ============================================================================
-- This ensures the trigger correctly extracts name and phone from user metadata
-- and handles cases where metadata might be NULL or empty

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  user_phone TEXT;
BEGIN
  -- Extract name and phone from raw_user_meta_data
  -- Handle both NULL and empty string cases
  user_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'name', '')), '');
  user_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  
  -- Insert profile with extracted values (use empty string if NULL for NOT NULL constraint)
  INSERT INTO public.profiles (id, name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(user_name, ''),
    COALESCE(user_phone, ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    -- Update name/phone if they're currently NULL or empty and we have new values
    name = COALESCE(
      NULLIF(profiles.name, ''),
      user_name,
      profiles.name
    ),
    phone = COALESCE(
      NULLIF(profiles.phone, ''),
      user_phone,
      profiles.phone
    ),
    email = COALESCE(profiles.email, NEW.email);
  
  RETURN NEW;
END;
$$;

-- Ensure trigger is still active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
