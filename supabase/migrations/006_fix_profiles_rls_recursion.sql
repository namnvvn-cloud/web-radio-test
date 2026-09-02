-- Fix: infinite recursion in RLS policies caused by self-referencing
-- subqueries against public.profiles.
--
-- Every "Admins can view all X" policy added in 002_phase1_complete_schema.sql
-- (and the storage policies in 005_storage_buckets.sql) checked admin status
-- with:
--   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
-- The profiles table's OWN "Admins can view all profiles" policy uses this
-- exact pattern against itself. Postgres has to re-apply RLS to evaluate
-- that subquery, which requires evaluating the same policy again, forever --
-- Postgres error 42P17 "infinite recursion detected in policy for relation
-- profiles". Any query touching profiles (directly, or indirectly through
-- one of the other tables' admin-check subquery) fails with a 500. This
-- silently broke every admin-role check in the app: AuthContext's isAdmin
-- flag, and every "admins can see everyone's data" policy on cellfiles,
-- logfiles, measurements, reports, subscriptions, audit_log,
-- benchmark_aggregates, app_pings, and the three storage.objects policies.
--
-- Fix: read the role through a SECURITY DEFINER function. It runs as the
-- function owner, bypassing the caller's RLS on profiles, so checking
-- admin status no longer re-triggers the profiles policies -- no recursion.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- profiles (the recursive one)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- cellfiles
DROP POLICY IF EXISTS "Admins can view all cellfiles" ON public.cellfiles;
CREATE POLICY "Admins can view all cellfiles" ON public.cellfiles
  FOR SELECT USING (public.is_admin());

-- logfiles
DROP POLICY IF EXISTS "Admins can view all logfiles" ON public.logfiles;
CREATE POLICY "Admins can view all logfiles" ON public.logfiles
  FOR SELECT USING (public.is_admin());

-- measurements
DROP POLICY IF EXISTS "Admins can view all measurements" ON public.measurements;
CREATE POLICY "Admins can view all measurements" ON public.measurements
  FOR SELECT USING (public.is_admin());

-- reports
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports" ON public.reports
  FOR SELECT USING (public.is_admin());

-- benchmark_aggregates
DROP POLICY IF EXISTS "Admins only" ON public.benchmark_aggregates;
CREATE POLICY "Admins only" ON public.benchmark_aggregates
  FOR SELECT USING (public.is_admin());

-- subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.is_admin());

-- audit_log
DROP POLICY IF EXISTS "Admins only" ON public.audit_log;
CREATE POLICY "Admins only" ON public.audit_log
  FOR SELECT USING (public.is_admin());

-- app_pings
DROP POLICY IF EXISTS "Admins only" ON public.app_pings;
CREATE POLICY "Admins only" ON public.app_pings
  FOR SELECT USING (public.is_admin());

-- storage.objects: reports bucket
DROP POLICY IF EXISTS "Admins can read all reports" ON storage.objects;
CREATE POLICY "Admins can read all reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reports' AND public.is_admin());

-- storage.objects: cellfiles bucket
DROP POLICY IF EXISTS "Admins can read all cellfile uploads" ON storage.objects;
CREATE POLICY "Admins can read all cellfile uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cellfiles' AND public.is_admin());

-- storage.objects: kb-documents bucket (admin-managed, all operations)
DROP POLICY IF EXISTS "Admins manage kb-documents" ON storage.objects;
CREATE POLICY "Admins manage kb-documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'kb-documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'kb-documents' AND public.is_admin());
