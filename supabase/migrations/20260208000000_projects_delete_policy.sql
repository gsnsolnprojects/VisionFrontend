-- Allow platform_admin and workspace_admin to delete projects (so UI can remove row after backend delete).
-- Uses existing check_user_is_admin() and check_user_role(); workspace_admin only in their company.

CREATE POLICY "admins_can_delete_projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    public.check_user_is_admin()
    AND
    (
      public.check_user_role('platform_admin')
      OR
      (
        public.check_user_role('workspace_admin')
        AND
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = projects.company_id
        )
      )
    )
  );
