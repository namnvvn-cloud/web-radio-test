-- Admin user management (SOP §4.1): "khoá/mở tài khoản" needs a flag to
-- lock on. profiles had no such column -- add it, default unlocked so
-- existing accounts are unaffected.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_locked IS
  'Set by an admin via /admin/users. Checked at sign-in (app/api/auth/signin/route.ts) -- a locked account authenticates fine against Supabase Auth but the API rejects issuing a session.';
