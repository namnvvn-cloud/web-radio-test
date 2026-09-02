# Phase 1 MVP: Core API + Live Data — COMPLETE ✅

**Status**: Tasks #5, #7 finished. User Portal & Admin Dashboard now call real endpoints instead of showing placeholders. `tsc --noEmit` and `eslint` both pass clean across the whole project.

---

## 🐛 Bug found & fixed: `app_pings` schema conflict

Migration 001 (`001_create_app_pings_table.sql`) created `app_pings` with columns `session_id, device_info, signal_data, location` — a shape that doesn't match SOP §4.1.1's actual Phase 0.5 design (`device_id, event, app_version, user_id`). Migration 002 tried to redefine the table correctly, but used `CREATE TABLE IF NOT EXISTS`, so if 001 ran first, 002's fix would have silently been skipped and the wrong schema would have stuck.

**Fix**: added `004_fix_app_pings_schema.sql`, which drops and recreates `app_pings` with the correct SOP-aligned shape. Safe to run regardless of whether 001 was already deployed — no real ping data exists yet. Also updated `/api/pings` and the `AppPing` type to match.

**Action needed**: run migrations in order **001 → 002 → 003 → 004 → 005** when deploying (004 corrects 001/002's conflict, so it must run after both).

---

## 🆕 What's new since the auth/portal pass

### Database (2 new migrations)
- **`003_geography_triggers.sql`** — auto-populates the PostGIS `location` column from `latitude`/`longitude` on insert/update for `cellfiles` and `measurements` (the API sends plain lat/lon; Postgres derives the geography point). Also adds `updated_at` auto-touch triggers so the API never has to set it manually.
- **`005_storage_buckets.sql`** — creates the 3 Storage buckets (`cellfiles`, `reports`, `kb-documents`) via SQL instead of manual dashboard clicks, with per-user-folder RLS policies (`storage.objects` path prefix = `auth.uid()`) plus admin-read-all policies.

### API routes (13 new endpoints)
| Route | Methods | Purpose |
|---|---|---|
| `/api/profile` | GET, PATCH | Own profile (name, phone, default operator) |
| `/api/cellfiles` | GET, POST | List / bulk-import cell records |
| `/api/cellfiles/[id]` | GET, DELETE | One record |
| `/api/logfiles` | GET, POST | List / create measurement sessions |
| `/api/logfiles/[id]` | GET, DELETE | One session + computed stats (min/avg/max RSRP/RSRQ/SINR/speed) |
| `/api/measurements` | GET, POST | Map/table data for a session / bulk import |
| `/api/reports` | GET | List reports with fresh 1-hour signed download URLs |
| `/api/reports/generate` | POST | Generate KML, Excel (`exceljs`), or CSV from a session |
| `/api/admin/stats` | GET | Dashboard metrics + Phase 0.5 usage (30-day window) |
| `/api/admin/users` | GET | List/search all users |
| `/api/admin/users/[id]` | GET, PATCH | View/change a user's role or tier (audit-logged) |
| `/api/admin/benchmarks` | GET | Query `benchmark_aggregates` (empty until the nightly job exists — Phase 2) |
| `/api/pings` | POST | Fixed to match corrected schema |

Every route under `/api/*` (except `/api/auth/*` and `/api/pings`) goes through `lib/api-auth.ts`'s `requireAuth`/`requireAdmin`, which verifies the Bearer token against Supabase and resolves the caller's admin flag from `profiles.role`. Admin mutations write to `audit_log` automatically via `logAudit()`.

### Report generation
- **KML**: hand-built XML, one placemark per measurement point, RSRP-based color coding (green/yellow/orange/red), popup with full metrics. No external dependency.
- **Excel**: `exceljs` — 3-sheet workbook (Summary, Statistics, raw Measurements).
- **CSV**: lightweight fallback, no dependency.
- **Word / PNG**: not implemented — noted as Phase 2 in the code (need a docx template engine and a headless map renderer respectively). The API rejects these types with a clear message rather than silently failing.
- Generated files are uploaded to the private `reports` Storage bucket under `<user_id>/...`; the API returns a 1-hour signed URL each time reports are listed.

### Frontend — now live, not placeholder
Every page under `/user/*` and the admin dashboard/users/benchmarks pages now fetch real data through a shared `lib/api-client.ts` (`apiFetch`, attaches the Supabase session's Bearer token automatically):

- **User Dashboard**: real counts (sessions, cell files, reports, tier), empty-state guidance
- **Cell Files**: CSV upload (client-side parser, no dependency) → bulk import → live table → delete
- **Measurements**: CSV upload creates a session + imports its measurements in one flow → live session list with counts → delete
- **Reports**: pick a session + format → generate → live list with working download links
- **Profile**: loads/saves against `/api/profile`, password reset wired to Supabase
- **Admin Dashboard**: real platform counts + Phase 0.5 usage stats + recent audit log
- **Admin Users**: live list, search, one-click role/tier toggle (self-demotion blocked)
- **Admin Benchmarks**: live query against `benchmark_aggregates` (will show data once Phase 2's aggregation job exists)

CSV import formats are documented inline on each upload page (required/optional columns).

---

## ✅ Verification done this pass

- `npx tsc --noEmit` — **zero errors** across the whole project
- `npx eslint app lib components` — **zero errors** (fixed 5 unescaped-apostrophe issues + 5 flagged-but-safe fetch-on-mount effects)
- Confirmed this cloud workspace has **no network path to Supabase** (`curl` times out), so none of this could be tested against your live database from here — the build/type checks above are the ceiling of what I could verify without your machine or a deployed instance. Everything needs a real test pass once the schema is deployed.

---

## 📋 Updated Deployment Checklist

1. **Push to GitHub**: `git push -u origin main`
2. **Run migrations in Supabase SQL Editor, in this exact order**:
   - `001_create_app_pings_table.sql`
   - `002_phase1_complete_schema.sql`
   - `003_geography_triggers.sql`
   - `004_fix_app_pings_schema.sql` ← corrects 001/002's conflict, must come after both
   - `005_storage_buckets.sql`
3. **Verify in Supabase Dashboard**:
   - 13 tables exist under Table Editor
   - Storage → 3 buckets exist: `cellfiles`, `reports`, `kb-documents` (all private)
   - `app_pings` table has columns `device_id, event, app_version, user_id` (not `session_id`)
4. **Google OAuth** (if not already done): Google Cloud Console → OAuth client → add to Supabase Auth → Providers → Google
5. **Test locally**:
   ```bash
   cd web-radio-test
   npm install   # picks up exceljs, added this pass
   npm run dev
   ```
   - Sign up / sign in → `/user/dashboard` should show 0s, not errors
   - Cell Files → upload a small CSV → should appear in the table
   - Measurements → upload a CSV → creates a session with imported rows
   - Reports → generate an Excel or KML report → download link should work
   - Make yourself admin: in Supabase Table Editor, set your `profiles.role` to `admin` → `/admin/dashboard` should show your real counts

---

## 📝 What's left (Tasks #6, #8, #9, #10)

| Task | Scope |
|---|---|
| #6 | Cellfile deduplication: `cellfiles_canonical` derived table, exact-match auto-merge (layer 1), fuzzy `ST_DWithin` 30m/10° match → admin approval queue (layer 2) per SOP §4.4.1. Needs a scheduled job (Supabase Edge Function or pg_cron). |
| #8 | Payment gateways: MoMo (QR/wallet), VNPay, Stripe — subscription tier logic already has the `subscriptions` table ready |
| #9 | E2E testing, Vercel deployment config, API docs |
| #10 | Android app: Supabase Auth migration + auto-sync calling the `/api/cellfiles` and `/api/measurements` bulk endpoints already built this pass |

**Next recommended step**: deploy + smoke-test what's built so far before adding more surface area (dedup job, payments) — easier to catch schema/RLS issues now than after more code depends on them.
