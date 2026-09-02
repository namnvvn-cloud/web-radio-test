import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/api-auth'

/**
 * GET /api/admin/benchmarks — query anonymized benchmark aggregates
 * Admin-only (3-layer protection per SOP §3.2: RLS blocks users at the
 * database layer regardless, this route is also never reachable from
 * /user/* code, and every read here could be audit-logged if needed).
 *
 * Query params: nha_mang, rat, band (filters), page, limit
 *
 * Note: benchmark_aggregates is populated by a nightly batch job that
 * has not been built yet (SOP §4.4, Phase 2 per the roadmap) — this
 * endpoint will return an empty list until that job exists and has run.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const nhaMang = searchParams.get('nha_mang')
  const rat = searchParams.get('rat')
  const band = searchParams.get('band')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '100', 10) || 100))

  let query = supabaseAdmin
    .from('benchmark_aggregates')
    .select('*', { count: 'exact' })
    .order('sample_count', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (nhaMang) query = query.eq('nha_mang', nhaMang)
  if (rat) query = query.eq('rat', rat)
  if (band) query = query.eq('band', band)

  const { data, error, count } = await query

  if (error) {
    console.error('Admin benchmarks fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch benchmark data' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    benchmarks: data,
    pagination: { page, limit, total: count || 0 },
  })
}
