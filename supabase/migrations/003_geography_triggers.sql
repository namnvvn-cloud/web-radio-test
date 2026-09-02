-- Phase 1 MVP: Auto-populate PostGIS `location` GEOGRAPHY columns
-- from latitude/longitude whenever a row is inserted or updated.
-- This lets the API layer insert plain lat/lon and have location
-- stay in sync for PostGIS queries (ST_DWithin dedup, benchmark
-- aggregates, map layers) without hand-building WKB client-side.

-- ============================================================================
-- Generic trigger function: sets NEW.location from NEW.latitude/longitude
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_location_from_lat_lon()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- cellfiles
-- ============================================================================

DROP TRIGGER IF EXISTS trg_cellfiles_set_location ON public.cellfiles;
CREATE TRIGGER trg_cellfiles_set_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.cellfiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_location_from_lat_lon();

-- ============================================================================
-- measurements
-- ============================================================================

DROP TRIGGER IF EXISTS trg_measurements_set_location ON public.measurements;
CREATE TRIGGER trg_measurements_set_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.measurements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_location_from_lat_lon();

-- ============================================================================
-- updated_at auto-touch trigger (generic, reused by all tables that have
-- an updated_at column) — keeps the API layer from having to set it manually
-- ============================================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_touch ON public.profiles;
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_cellfiles_touch ON public.cellfiles;
CREATE TRIGGER trg_cellfiles_touch BEFORE UPDATE ON public.cellfiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_logfiles_touch ON public.logfiles;
CREATE TRIGGER trg_logfiles_touch BEFORE UPDATE ON public.logfiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_measurements_touch ON public.measurements;
CREATE TRIGGER trg_measurements_touch BEFORE UPDATE ON public.measurements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_reports_touch ON public.reports;
CREATE TRIGGER trg_reports_touch BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_touch ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_touch BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
