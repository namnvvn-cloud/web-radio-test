import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET /api/logfiles/[id] — fetch one session with summary stats
 * (min/avg/max RSRP, RSRQ, SINR — SOP §4.5)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (Number.isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid logfile id' }, { status: 400 })
  }

  let logfileQuery = supabaseAdmin.from('logfiles').select('*').eq('id', numericId)
  if (!auth.isAdmin) {
    logfileQuery = logfileQuery.eq('user_id', auth.user.id)
  }

  const { data: logfile, error: logfileError } = await logfileQuery.single()

  if (logfileError || !logfile) {
    return NextResponse.json({ error: 'Logfile not found' }, { status: 404 })
  }

  // Pull measurements for stats — capped, this is a summary not a full export
  const { data: measurements, error: measError } = await supabaseAdmin
    .from('measurements')
    .select('rsrp, rsrq, sinr, download_speed_mbps, upload_speed_mbps')
    .eq('logfile_id', numericId)
    .limit(50000)

  if (measError) {
    console.error('Measurements stats fetch error:', measError)
    return NextResponse.json({ error: 'Failed to compute stats' }, { status: 500 })
  }

  const stats = computeStats(measurements || [])

  return NextResponse.json({
    success: true,
    logfile,
    stats,
  })
}

/**
 * DELETE /api/logfiles/[id] — delete a session (cascades to its measurements & reports)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (Number.isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid logfile id' }, { status: 400 })
  }

  let query = supabaseAdmin.from('logfiles').delete().eq('id', numericId)
  if (!auth.isAdmin) {
    query = query.eq('user_id', auth.user.id)
  }

  const { data, error } = await query.select('id')

  if (error) {
    console.error('Logfile delete error:', error)
    return NextResponse.json({ error: 'Failed to delete logfile' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Logfile not found or not owned by you' }, { status: 404 })
  }

  return NextResponse.json({ success: true, deleted: numericId })
}

type StatRow = {
  rsrp: number | null
  rsrq: number | null
  sinr: number | null
  download_speed_mbps: number | null
  upload_speed_mbps: number | null
}

function computeStats(rows: StatRow[]) {
  const summarize = (values: number[]) => {
    if (values.length === 0) return { min: null, avg: null, max: null, count: 0 }
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    return { min, avg: Math.round(avg * 100) / 100, max, count: values.length }
  }

  const pick = (key: keyof StatRow) =>
    rows.map((r) => r[key]).filter((v): v is number => typeof v === 'number')

  return {
    total_measurements: rows.length,
    rsrp: summarize(pick('rsrp')),
    rsrq: summarize(pick('rsrq')),
    sinr: summarize(pick('sinr')),
    download_speed_mbps: summarize(pick('download_speed_mbps')),
    upload_speed_mbps: summarize(pick('upload_speed_mbps')),
  }
}
