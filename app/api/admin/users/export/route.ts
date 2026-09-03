import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin, logAudit } from '@/lib/api-auth'
import { applyUserFilters, parseUserFilters } from '@/lib/admin-user-filters'
import { generateUsersExcel, type UserExportRow } from '@/lib/report-generators'

/**
 * GET /api/admin/users/export — Excel export of the platform user list.
 * Admin-only. Accepts the same filters as GET /api/admin/users (search,
 * tier, status, from/to) so "Export Excel" on /admin/users always exports
 * exactly what's currently on screen. Capped at 5000 rows — well above
 * any realistic admin's need; raise if the user base grows past that.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const filters = parseUserFilters(searchParams)

  let query = supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5000)

  query = applyUserFilters(query, filters)

  const { data, error } = await query

  if (error) {
    console.error('Admin users export fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  const users = data || []
  const ids = users.map((u) => u.id)
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

  const rows: UserExportRow[] = users.map((u) => ({
    ...u,
    cellfiles_count: cellfileCounts.get(u.id) || 0,
    logfiles_count: logfileCounts.get(u.id) || 0,
    reports_count: reportCounts.get(u.id) || 0,
  }))

  const buffer = await generateUsersExcel(rows)

  await logAudit(auth.user.id, 'users_exported', 'profiles', 'bulk', {
    row_count: rows.length,
    filters,
  })

  const filename = `users_${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
