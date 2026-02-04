-- Allow company admins (workspace_admin, platform_admin) to update their company,
-- not only the creator. Fixes company name edit in User Profile when created_by is NULL
-- or when an admin who didn't create the company needs to update it.

DROP POLICY IF EXISTS "Company creators can update their company" ON public.companies;

CREATE POLICY "Company creators and admins can update their company"
  ON public.companies FOR UPDATE
  USING (
    -- Creator can always update
    auth.uid() = created_by
    OR
    -- Any workspace_admin or platform_admin in this company can update
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = companies.id
        AND p.role IN ('workspace_admin', 'platform_admin')
    )
  );
