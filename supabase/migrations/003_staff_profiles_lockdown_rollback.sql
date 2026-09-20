-- Rollback for 003_staff_profiles_lockdown.sql.
-- Read every statement before running this in the Supabase SQL Editor.
--
-- IMPORTANT: I do not have the exact original definition of
-- allow_all_operations (I never received the raw pg_policies output,
-- only the policy names you listed). The CREATE POLICY below is a
-- best-effort reconstruction (permissive, matches the "allow all" name).
-- Before running this rollback, compare it against your pg_policies
-- output for staff_profiles and edit the USING/WITH CHECK clause and
-- target roles if the original was different.

DROP TRIGGER IF EXISTS trg_protect_staff_profile_columns ON public.staff_profiles;
DROP FUNCTION IF EXISTS public.protect_staff_profile_columns();

DROP POLICY IF EXISTS staff_profiles_update_own ON public.staff_profiles;
DROP POLICY IF EXISTS staff_profiles_select_own ON public.staff_profiles;

DROP FUNCTION IF EXISTS public.current_staff_role();

-- Best-effort restore of the original permissive policy. Verify against
-- your own pg_policies output before running.
CREATE POLICY allow_all_operations ON public.staff_profiles
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
