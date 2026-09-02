-- Phase 1 MVP: Complete database schema with RLS policies
-- Web Radio Test platform — 12 tables for auth, user data, benchmarking, chat, billing

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- TABLE 1: profiles
-- Stores user profile data linked to auth.users
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone_number TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  nha_mang_mac_dinh TEXT DEFAULT 'MobiFone' CHECK (nha_mang_mac_dinh IN (
    'MobiFone', 'Viettel', 'VNPT', 'Vietnamobile',
    'Gmobile', 'Reddi', 'Elise', 'Itelecom', 'Wintel'
  )),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view and update only their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE 2: cellfiles
-- Stores cell/site information imported by users
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cellfiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  cell_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  rat TEXT NOT NULL CHECK (rat IN ('2G', '3G', '4G', '5G')),
  band TEXT,
  nha_mang TEXT CHECK (nha_mang IN (
    'MobiFone', 'Viettel', 'VNPT', 'Vietnamobile',
    'Gmobile', 'Reddi', 'Elise', 'Itelecom', 'Wintel'
  )),
  azimuth DOUBLE PRECISION,
  radius DOUBLE PRECISION,
  source_file TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cellfiles_user_id ON public.cellfiles(user_id);
CREATE INDEX idx_cellfiles_nha_mang ON public.cellfiles(nha_mang);
CREATE INDEX idx_cellfiles_location ON public.cellfiles USING GIST(location);

-- Enable RLS on cellfiles
ALTER TABLE public.cellfiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own cellfiles
CREATE POLICY "Users can view own cellfiles" ON public.cellfiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cellfiles" ON public.cellfiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cellfiles" ON public.cellfiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Admins can see all cellfiles
CREATE POLICY "Admins can view all cellfiles" ON public.cellfiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE 3: logfiles
-- Stores measurement sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.logfiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_info JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_logfiles_user_id ON public.logfiles(user_id);
CREATE INDEX idx_logfiles_session_date ON public.logfiles(session_date);

-- Enable RLS on logfiles
ALTER TABLE public.logfiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own logfiles
CREATE POLICY "Users can view own logfiles" ON public.logfiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logfiles" ON public.logfiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logfiles" ON public.logfiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Admins can see all logfiles
CREATE POLICY "Admins can view all logfiles" ON public.logfiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE 4: measurements
-- Individual measurement records from signal tests
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.measurements (
  id BIGSERIAL PRIMARY KEY,
  logfile_id BIGINT NOT NULL REFERENCES public.logfiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location GEOGRAPHY(POINT, 4326),
  cell_id TEXT,
  cell_name TEXT,
  pci BIGINT,
  rsrp DOUBLE PRECISION,
  rsrq DOUBLE PRECISION,
  sinr DOUBLE PRECISION,
  rat TEXT CHECK (rat IN ('2G', '3G', '4G', '5G')),
  band TEXT,
  mcc BIGINT,
  mnc BIGINT,
  nha_mang TEXT CHECK (nha_mang IN (
    'MobiFone', 'Viettel', 'VNPT', 'Vietnamobile',
    'Gmobile', 'Reddi', 'Elise', 'Itelecom', 'Wintel'
  )),
  download_speed_mbps DOUBLE PRECISION,
  upload_speed_mbps DOUBLE PRECISION,
  latitude_accuracy DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_measurements_logfile_id ON public.measurements(logfile_id);
CREATE INDEX idx_measurements_user_id ON public.measurements(user_id);
CREATE INDEX idx_measurements_timestamp ON public.measurements(timestamp);
CREATE INDEX idx_measurements_nha_mang ON public.measurements(nha_mang);
CREATE INDEX idx_measurements_location ON public.measurements USING GIST(location);

-- Enable RLS on measurements
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own measurements
CREATE POLICY "Users can view own measurements" ON public.measurements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own measurements" ON public.measurements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Admins can see all measurements
CREATE POLICY "Admins can view all measurements" ON public.measurements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE 5: reports
-- Generated reports (Word, Excel, KML files)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  logfile_id BIGINT NOT NULL REFERENCES public.logfiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('word', 'excel', 'kml', 'png')),
  file_url TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_user_id ON public.reports(user_id);
CREATE INDEX idx_reports_logfile_id ON public.reports(logfile_id);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own reports
CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Admins can see all reports
CREATE POLICY "Admins can view all reports" ON public.reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE 6: benchmark_aggregates
-- Admin-only anonymized and aggregated measurement data
-- Populated by nightly batch job
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.benchmark_aggregates (
  id BIGSERIAL PRIMARY KEY,
  geohash TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  nha_mang TEXT NOT NULL CHECK (nha_mang IN (
    'MobiFone', 'Viettel', 'VNPT', 'Vietnamobile',
    'Gmobile', 'Reddi', 'Elise', 'Itelecom', 'Wintel'
  )),
  rat TEXT CHECK (rat IN ('2G', '3G', '4G', '5G')),
  band TEXT,
  sample_count BIGINT DEFAULT 0,
  avg_rsrp DOUBLE PRECISION,
  median_rsrp DOUBLE PRECISION,
  avg_rsrq DOUBLE PRECISION,
  median_rsrq DOUBLE PRECISION,
  avg_sinr DOUBLE PRECISION,
  median_sinr DOUBLE PRECISION,
  avg_download_mbps DOUBLE PRECISION,
  median_download_mbps DOUBLE PRECISION,
  timestamp_start TIMESTAMP WITH TIME ZONE,
  timestamp_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_benchmark_aggregates_nha_mang ON public.benchmark_aggregates(nha_mang);
CREATE INDEX idx_benchmark_aggregates_rat ON public.benchmark_aggregates(rat);
CREATE INDEX idx_benchmark_aggregates_timestamp ON public.benchmark_aggregates(timestamp_end);

-- Enable RLS on benchmark_aggregates
ALTER TABLE public.benchmark_aggregates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: BLOCK all access for regular users (3-layer security)
-- Empty policy means no one can access except service role (via backend)
CREATE POLICY "Admins only" ON public.benchmark_aggregates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE 7: kb_documents
-- Knowledge base documents for RAG chatbot
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kb_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kb_documents_category ON public.kb_documents(category);

-- ============================================================================
-- TABLE 8: kb_chunks
-- Document chunks with embeddings for vector search
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kb_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INT,
  embedding vector(1024),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kb_chunks_document_id ON public.kb_chunks(document_id);
CREATE INDEX idx_kb_chunks_embedding ON public.kb_chunks USING ivfflat(embedding vector_cosine_ops);

-- ============================================================================
-- TABLE 9: chat_sessions
-- Chatbot conversation sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);

-- Enable RLS on chat_sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own chat sessions
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TABLE 10: chat_messages
-- Individual chat messages in a session
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_role TEXT CHECK (message_role IN ('user', 'assistant')),
  sources JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own chat messages
CREATE POLICY "Users can view own chat messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TABLE 11: subscriptions
-- User subscription data
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('free', 'pro')),
  payment_method TEXT CHECK (payment_method IN ('momo', 'vnpay', 'stripe', 'none')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
  transaction_id TEXT,
  billing_cycle_start TIMESTAMP WITH TIME ZONE,
  billing_cycle_end TIMESTAMP WITH TIME ZONE,
  amount_paid DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own subscription
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Admins can see all subscriptions
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE 12: audit_log
-- Admin action audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin_id ON public.audit_log(admin_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can read audit log
CREATE POLICY "Admins only" ON public.audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE 13: app_pings
-- Anonymous app usage statistics (Phase 0.5)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_pings (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('open', 'login_success', 'heartbeat')),
  app_version TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_app_pings_device_id ON public.app_pings(device_id);
CREATE INDEX idx_app_pings_event ON public.app_pings(event);
CREATE INDEX idx_app_pings_created_at ON public.app_pings(created_at);

-- Enable RLS on app_pings
ALTER TABLE public.app_pings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can INSERT (fire-and-forget)
CREATE POLICY "Allow INSERT from app" ON public.app_pings
  FOR INSERT WITH CHECK (true);

-- RLS Policy: Only admins can SELECT
CREATE POLICY "Admins only" ON public.app_pings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- Storage buckets setup (if using Supabase Storage)
-- ============================================================================

-- Insert default storage buckets via Supabase dashboard after migration
-- Needed buckets:
-- - cellfiles: user uploaded cellfile data (private per user)
-- - reports: generated reports (private per user)
-- - kb-documents: knowledge base files (admin only)

-- ============================================================================
-- Grant usage permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Specific grants for vector operations
GRANT USAGE ON SCHEMA vector TO authenticated;
