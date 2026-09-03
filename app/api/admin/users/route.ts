import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/api-auth'
import { applyUserFilters, parseUserFilters } from '@/lib/admin-user-filters'

/**
 * GET /api/admin/users — list all platform users
 * Admin-only. Query params: page, limit, search (matches email or full_name),
 * tier ('free'|'pro'), status ('active'|'locked'), from/to (registration date
 * range, YYYY-MM-DD) — see lib/admin-user-filters.ts. The same filters drive
 * /api/admin/users/export so the Excel export always matches the page.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25))
  const filters = parseUserFilters(searchParams)

  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  query = applyUserFilters(query, filters)

  const { data, error, count } = await query

  if (error) {
    console.error('Admin users fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  // Per-user file counts (cellfiles/logfiles/reports) for the support
  // view in /admin/users -- SOP §4.1 "xem danh sách file cellfile/logfile
  // /report đã upload theo từng user". Tallied client-side from the raw
  // user_id column rather than a GROUP BY RPC, since the page is capped
  // at 100 users -- three cheap filtered selects beat adding a database
  // function for this.
  const ids = (data || []).map((u) => u.id)
  const tally = async (table: string) => {
    if (ids.length === 0) return new Map<string, number>()
    const { data: rows } = await supabaseAdmin.from(table).select('user_id').in('user_id', ids)
    const counts = new Map<string, number>()
    for (const row of rows || []) {
      counts.set(row.user_id, (counts.get(row.user_id) || 0) + 1)
    }
    return counts
  }

  const [cellfileCounts, logfileCounts, reportCounts] = await Promise.all([
    tally('cellfiles'),
    tally('logfiles'),
    tally('reports'),
  ])

  const users = (data || []).map((u) => ({
    ...u,
    cellfiles_count: cellfileCounts.get(u.id) || 0,
    logfiles_count: logfileCounts.get(u.id) || 0,
    reports_count: reportCounts.get(u.id) || 0,
  }))

  return NextResponse.json({
    success: true,
    users,
    pagination: { page, limit, total: count || 0 },
  })
}
