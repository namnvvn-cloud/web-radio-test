-- Fix: migration 001 created app_pings with a different shape
-- (session_id, device_info, signal_data, location) than what the SOP's
-- Phase 0.5 usage-stats design and migration 002 actually need
-- (device_id, event, app_version, user_id). Because migration 002 used
-- CREATE TABLE IF NOT EXISTS, if 001 ran first the old shape would have
-- silently won. No real ping data exists yet (Phase 0.5 has not been
-- live), so it's safe to drop and recreate cleanly rather than migrate
-- data.

DROP TABLE IF EXISTS public.app_pings CASCADE;

CREATE TABLE public.app_pings (
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

ALTER TABLE public.app_pings ENABLE ROW LEVEL SECURITY;

-- Fire-and-forget insert from the app — no auth required (device_id is
-- the correlation key, not a login)
CREATE POLICY "Allow INSERT from app" ON public.app_pings
  FOR INSERT WITH CHECK (true);

-- Only admins can read ping data (service role bypasses RLS entirely,
-- which is what the admin API routes use)
CREATE POLICY "Admins only" ON public.app_pings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

GRANT ALL PRIVILEGES ON public.app_pings TO authenticated;
GRANT INSERT ON public.app_pings TO anon;
GRANT USAGE ON SEQUENCE public.app_pings_id_seq TO anon, authenticated;
