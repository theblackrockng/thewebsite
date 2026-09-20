-- Phase 1: lock down staff_profiles.
-- Read every statement before running this in the Supabase SQL Editor.
-- Do not run without confirming console/api/update-staff.js and the
-- related client changes are already deployed - client code depends on
-- this migration and vice versa.

-- Pre-check: run this first, on its own, and review the results before
-- running the migration below.
--   select id, email, role, active, status from staff_profiles order by role;

-- 1. Helper function: returns the caller's own role, only if their
--    profile is active. SECURITY DEFINER so it can read staff_profiles
--    even though RLS on staff_profiles will otherwise only let a user
--    see their own row. STABLE and a fixed search_path avoid the usual
--    RLS recursion and search-path hijack pitfalls with SECURITY
--    DEFINER functions.
CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.staff_profiles
  WHERE id = auth.uid() AND active = true
  LIMIT 1;
$$;

-- 2. Drop the old permissive policy.
DROP POLICY IF EXISTS allow_all_operations ON public.staff_profiles;

-- 3. SELECT: a user can read their own row, or any row if they are an
--    active super_admin.
DROP POLICY IF EXISTS staff_profiles_select_own ON public.staff_profiles;
CREATE POLICY staff_profiles_select_own ON public.staff_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.current_staff_role() = 'super_admin'
  );

-- 4. UPDATE: own row only. This policy cannot restrict which columns
--    change - that protection is the trigger below.
DROP POLICY IF EXISTS staff_profiles_update_own ON public.staff_profiles;
CREATE POLICY staff_profiles_update_own ON public.staff_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5. No INSERT or DELETE policy is created here. With RLS enabled and no
--    policy for a command, that command is denied outright to anon and
--    authenticated roles - only the service role (which bypasses RLS)
--    can insert or delete rows. console/api/invite.js and
--    console/api/delete-staff.js already use the service role.

-- 6. Trigger: block changes to role, permissions, active or status from
--    anything except the service role, or a call with no JWT at all
--    (such as the SQL Editor). BYPASSRLS (which the service role has)
--    does not skip triggers, so this still needs an explicit check - it
--    is not redundant with the RLS policies above.
CREATE OR REPLACE FUNCTION public.protect_staff_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.active IS DISTINCT FROM OLD.active
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'role, permissions, active and status can only be changed by a server-side endpoint';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_staff_profile_columns ON public.staff_profiles;
CREATE TRIGGER trg_protect_staff_profile_columns
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_staff_profile_columns();

-- Manual test after running (do this in the app, not the SQL editor, so
-- it goes through PostgREST with a real anon-key session):
--   Sign in as any non-super-admin staff member, open the browser
--   console, and run:
--     await supabase.from('staff_profiles').update({ role: 'super_admin' }).eq('id', (await supabase.auth.getUser()).data.user.id)
--   Expected: an error mentioning "role, permissions, active and status
--   can only be changed by a server-side endpoint" and no row changed.
