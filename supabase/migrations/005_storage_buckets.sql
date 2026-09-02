-- Phase 1 MVP: Supabase Storage buckets
-- Storage buckets are just rows in storage.buckets — created here via SQL
-- so the whole schema deploys in one pass instead of requiring manual
-- dashboard clicks (noted as a TODO in migration 002).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('cellfiles', 'cellfiles', false, 20971520, NULL), -- 20MB, user-uploaded cellfile source files
  ('reports', 'reports', false, 20971520, NULL),     -- 20MB, generated Word/Excel/KML/PNG reports
  ('kb-documents', 'kb-documents', false, 52428800, NULL) -- 50MB, admin-only knowledge base source files
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- reports bucket — user reads/writes only their own folder (path prefix
-- = their user id), admins can read everything. Everything goes through
-- the service role from API routes in practice, but these policies keep
-- the bucket safe if a client ever uses the anon/user key directly.
-- ============================================================================

CREATE POLICY "Users can read own reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own reports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own reports"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can read all reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- cellfiles bucket — same per-user folder pattern, for the original
-- uploaded source files (KML/CSV/Excel) kept alongside the parsed rows
-- ============================================================================

CREATE POLICY "Users can read own cellfile uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cellfiles' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own cellfile uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cellfiles' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can read all cellfile uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cellfiles' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- kb-documents bucket — admin only, both read and write
-- ============================================================================

CREATE POLICY "Admins manage kb-documents"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'kb-documents' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'kb-documents' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
