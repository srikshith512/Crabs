-- Run this in Supabase → SQL Editor once if project creation fails with:
-- "new row violates row-level security policy for table 'projects'"
--
-- Cause: a single FOR ALL / USING-only policy can fail INSERT checks; policies
-- should use explicit WITH CHECK for new rows. Requests use the authenticated
-- user JWT (auth.uid()).

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Individual User Access" ON public.projects;

CREATE POLICY "projects_select_own"
  ON public.projects FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "projects_insert_own"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "projects_update_own"
  ON public.projects FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "projects_delete_own"
  ON public.projects FOR DELETE
  USING (auth.uid() = owner_id);
