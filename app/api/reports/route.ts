import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET /api/reports — list the caller's own generated reports
 * Query params: logfile_id (optional filter), page, limit
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const logfileId = searchParams.get('logfile_id')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))

  let query = supabaseAdmin
    .from('reports')
    .select('*', { count: 'exact' })
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (logfileId) query = query.eq('logfile_id', logfileId)

  const { data, error, count } = await query

  if (error) {
    console.error('Reports fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }

  // Attach a fresh signed URL for each report (bucket is private)
  const withUrls = await Promise.all(
    (data || []).map(async (report) => {
      const { data: signed } = await supabaseAdmin.storage
        .from('reports')
        .createSignedUrl(report.file_url, 3600) // 1 hour
      return { ...report, download_url: signed?.signedUrl || null }
    })
  )

  return NextResponse.json({
    success: true,
    reports: withUrls,
    pagination: { page, limit, total: count || 0 },
  })
}
