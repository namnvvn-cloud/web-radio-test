-- Create app_pings table for storing ping records from mobile app
CREATE TABLE IF NOT EXISTS app_pings (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  device_info JSONB,
  signal_data JSONB,
  location GEOGRAPHY(POINT, 4326)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_app_pings_session_id ON app_pings(session_id);
CREATE INDEX IF NOT EXISTS idx_app_pings_timestamp ON app_pings(timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE app_pings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can insert pings" ON app_pings;
DROP POLICY IF EXISTS "Prevent public read access" ON app_pings;
DROP POLICY IF EXISTS "Prevent public update" ON app_pings;
DROP POLICY IF EXISTS "Prevent public delete" ON app_pings;

-- Policy: Anyone (unauthenticated) can INSERT
CREATE POLICY "Anyone can insert pings"
  ON app_pings
  FOR INSERT
  WITH CHECK (TRUE);

-- Policy: Prevent public READ (only authenticated admins via service role)
CREATE POLICY "Prevent public read access"
  ON app_pings
  FOR SELECT
  USING (FALSE);

-- Policy: Prevent UPDATE
CREATE POLICY "Prevent public update"
  ON app_pings
  FOR UPDATE
  USING (FALSE);

-- Policy: Prevent DELETE
CREATE POLICY "Prevent public delete"
  ON app_pings
  FOR DELETE
  USING (FALSE);

-- Note: Service Role can bypass RLS, so admins can still read via service role key
