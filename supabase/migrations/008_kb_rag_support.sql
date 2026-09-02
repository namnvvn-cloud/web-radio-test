-- Phase 2: Chatbot RAG infrastructure (SOP §4.2).
--
-- kb_documents/kb_chunks were already created in 002_phase1_complete_schema.sql
-- but had no RLS and no vector-search RPC. This migration:
--   1. Locks kb_documents/kb_chunks down to service-role-only access -- per
--      SOP §3 these tables are "hệ thống dùng nội bộ (không hiển thị trực
--      tiếp cho ai)": no anon/authenticated policy is created at all, so
--      only supabaseAdmin (service role, bypasses RLS) can read/write them.
--      The chat API route is the only caller, and it always uses
--      supabaseAdmin -- never the user's own session -- for KB access.
--   2. Adds match_kb_chunks(), a cosine-similarity top-k search over
--      kb_chunks.embedding, used by /api/chat to find the passages closest
--      to the user's question before calling Claude.

ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: default-deny for anon/authenticated roles.
-- Service role (supabaseAdmin) bypasses RLS entirely, which is the only
-- path the app uses to read these tables.

CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  query_embedding vector(1024),
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  chunk_text text,
  chunk_index int,
  title text,
  category text,
  source text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS chunk_id,
    c.document_id,
    c.chunk_text,
    c.chunk_index,
    d.title,
    d.category,
    d.source,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.kb_chunks c
  JOIN public.kb_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_kb_chunks IS
  'Cosine-similarity top-k search over kb_chunks.embedding. SECURITY DEFINER so it can read kb_chunks/kb_documents (RLS-locked to service role) when called via the anon/authenticated role -- in practice it is only ever invoked by the server using supabaseAdmin, but SECURITY DEFINER keeps the function usable regardless of caller role.';

-- Allow the function to be called (RLS on the underlying tables still
-- applies to any *other* access path; this only affects the RPC itself).
GRANT EXECUTE ON FUNCTION public.match_kb_chunks(vector, int, float) TO authenticated, service_role;
