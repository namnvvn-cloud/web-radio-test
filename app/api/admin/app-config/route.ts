import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin, logAudit } from '@/lib/api-auth'

/**
 * Admin API for the app_config key/value table (Phase 1 force-update
 * feature — see Backend.fetchAppConfig() / MainActivity on Android).
 * Public GET /api/app-config (no auth) is what the app itself reads on
 * startup; this route is the admin-only read/write pair behind
 * /admin/settings so an admin can change those values without touching
 * the database directly.
 */

const KEYS = ['minVersionCode', 'latestVersionCode', 'downloadUrl', 'notes'] as const
type ConfigKey = (typeof KEYS)[number]

/**
 * GET /api/admin/app-config — current app_config values + last-updated
 * timestamp. Admin-only.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data, error } = await supabaseAdmin
    .from('app_config')
    .select('key, value, updated_at')
    .in('key', KEYS)

  if (error) {
    console.error('Admin app-config fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch app config' }, { status: 500 })
  }

  const config: Record<string, string> = {}
  let updatedAt: string | null = null
  for (const row of data || []) {
    config[row.key] = row.value
    if (!updatedAt || (row.updated_at && row.updated_at > updatedAt)) {
      updatedAt = row.updated_at
    }
  }
  // app_config.updated_at is a `timestamp without time zone` column, but
  // every write stores new Date().toISOString() (UTC). PostgREST
  // serializes it back without a trailing offset, which makes
  // `new Date(...)` on the client mis-parse it as local time. Values are
  // always UTC, so normalize before returning.
  if (updatedAt && !/[zZ]|[+-]\d\d:\d\d$/.test(updatedAt)) {
    updatedAt = `${updatedAt}Z`
  }

  return NextResponse.json({
    success: true,
    minVersionCode: parseInt(config.minVersionCode || '0', 10) || 0,
    latestVersionCode: parseInt(config.latestVersionCode || '0', 10) || 0,
    downloadUrl: config.downloadUrl || '',
    notes: config.notes || '',
    updated_at: updatedAt,
  })
}

/**
 * PUT /api/admin/app-config — update app_config values.
 * Admin-only. Body: { minVersionCode: number, latestVersionCode: number,
 * downloadUrl: string, notes?: string }. All four are written together
 * (upsert) so the config row set stays consistent. Every change is
 * written to audit_log with before/after values.
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const minVersionCode = Number(body.minVersionCode)
  const latestVersionCode = Number(body.latestVersionCode)
  const downloadUrl = typeof body.downloadUrl === 'string' ? body.downloadUrl.trim() : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''

  if (!Number.isInteger(minVersionCode) || minVersionCode < 1) {
    return NextResponse.json({ error: 'minVersionCode must be a positive integer' }, { status: 400 })
  }
  if (!Number.isInteger(latestVersionCode) || latestVersionCode < 1) {
    return NextResponse.json({ error: 'latestVersionCode must be a positive integer' }, { status: 400 })
  }
  if (minVersionCode > latestVersionCode) {
    return NextResponse.json(
      { error: 'minVersionCode cannot be greater than latestVersionCode' },
      { status: 400 }
    )
  }
  if (!downloadUrl) {
    return NextResponse.json({ error: 'downloadUrl is required' }, { status: 400 })
  }
  try {
    void new URL(downloadUrl)
  } catch {
    return NextResponse.json({ error: 'downloadUrl must be a valid URL' }, { status: 400 })
  }

  const { data: before } = await supabaseAdmin
    .from('app_config')
    .select('key, value')
    .in('key', KEYS)

  const beforeMap: Record<string, string> = {}
  for (const row of before || []) beforeMap[row.key] = row.value

  const now = new Date().toISOString()
  const values: Record<ConfigKey, string> = {
    minVersionCode: String(minVersionCode),
    latestVersionCode: String(latestVersionCode),
    downloadUrl,
    notes,
  }

  const rows = KEYS.map((key) => ({ key, value: values[key], updated_at: now }))

  const { error } = await supabaseAdmin.from('app_config').upsert(rows, { onConflict: 'key' })

  if (error) {
    console.error('Admin app-config update error:', error)
    return NextResponse.json({ error: 'Failed to update app config' }, { status: 500 })
  }

  await logAudit(auth.user.id, 'app_config_updated', 'app_config', 'app_config', {
    before: beforeMap,
    after: values,
  })

  return NextResponse.json({
    success: true,
    minVersionCode,
    latestVersionCode,
    downloadUrl,
    notes,
    updated_at: now,
  })
}
