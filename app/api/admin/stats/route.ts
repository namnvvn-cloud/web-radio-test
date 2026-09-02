import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/api-auth'

/**
 * GET /api/admin/stats — dashboard overview metrics
 * Admin-only. Combines core platform counts with Phase 0.5 app usage
 * stats (SOP §4.1.1) so the admin dashboard has one endpoint to call.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const countOf = async (table: string) => {
    const { count } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
    return count || 0
  }

  const [
    totalUsers,
    totalCellfiles,
    totalLogfiles,
    totalMeasurements,
    totalReports,
  ] = await Promise.all([
    countOf('profiles'),
    countOf('cellfiles'),
    countOf('logfiles'),
    countOf('measurements'),
    countOf('reports'),
  ])

  // Phase 0.5 usage stats — last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentPings } = await supabaseAdmin
    .from('app_pings')
    .select('event, device_id, created_at')
    .gte('created_at', thirtyDaysAgo)
    .limit(50000)

  const pings = recentPings || []
  const uniqueDevices = new Set(pings.map((p) => p.device_id)).size
  const opens = pings.filter((p) => p.event === 'open').length
  const loginSuccesses = pings.filter((p) => p.event === 'login_success').length
  const heartbeats = pings.filter((p) => p.event === 'heartbeat').length

  // Recent audit log
  const { data: recentAudit } = await supabaseAdmin
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    success: true,
    stats: {
      total_users: totalUsers,
      total_cellfiles: totalCellfiles,
      total_logfiles: totalLogfiles,
      total_measurements: totalMeasurements,
      total_reports: totalReports,
      app_usage_last_30_days: {
        unique_devices: uniqueDevices,
        app_opens: opens,
        login_successes: loginSuccesses,
        heartbeats: heartbeats,
      },
      recent_audit_log: recentAudit || [],
    },
  })
}
