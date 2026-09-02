import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'

const VALID_RAT = ['2G', '3G', '4G', '5G']
const VALID_OPERATORS = [
  'MobiFone', 'Viettel', 'VNPT', 'Vietnamobile',
  'Gmobile', 'Reddi', 'Elise', 'Itelecom', 'Wintel',
]

type MeasurementInput = {
  timestamp?: string
  latitude?: number
  longitude?: number
  cell_id?: string
  cell_name?: string
  pci?: number
  rsrp?: number
  rsrq?: number
  sinr?: number
  rat?: string
  band?: string
  mcc?: number
  mnc?: number
  nha_mang?: string
  download_speed_mbps?: number
  upload_speed_mbps?: number
  latitude_accuracy?: number
}

function validateMeasurement(row: unknown, index: number): { valid: boolean; error?: string } {
  const r = row as MeasurementInput

  if (r.latitude !== undefined && (typeof r.latitude !== 'number' || r.latitude < -90 || r.latitude > 90)) {
    return { valid: false, error: `Row ${index}: latitude must be a number between -90 and 90` }
  }
  if (r.longitude !== undefined && (typeof r.longitude !== 'number' || r.longitude < -180 || r.longitude > 180)) {
    return { valid: false, error: `Row ${index}: longitude must be a number between -180 and 180` }
  }
  if (r.rat !== undefined && !VALID_RAT.includes(r.rat)) {
    return { valid: false, error: `Row ${index}: rat must be one of ${VALID_RAT.join(', ')}` }
  }
  if (r.nha_mang !== undefined && !VALID_OPERATORS.includes(r.nha_mang)) {
    return { valid: false, error: `Row ${index}: nha_mang must be one of ${VALID_OPERATORS.join(', ')}` }
  }
  if (r.timestamp !== undefined && Number.isNaN(new Date(r.timestamp).getTime())) {
    return { valid: false, error: `Row ${index}: timestamp must be a valid ISO date string` }
  }

  return { valid: true }
}

/**
 * GET /api/measurements?logfile_id=X — list measurements for a session
 * (used for the map view and measurement table). Query params:
 * logfile_id (required), page, limit (max 1000 per page — this powers
 * map rendering, not just a table)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const logfileId = searchParams.get('logfile_id')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '500', 10) || 500))

  if (!logfileId) {
    return NextResponse.json({ error: 'logfile_id query parameter is required' }, { status: 400 })
  }

  // Verify the logfile belongs to the caller (or caller is admin) before
  // returning its measurements — RLS also enforces this, but a clear
  // 404 is friendlier than an empty 200.
  let logfileQuery = supabaseAdmin.from('logfiles').select('id').eq('id', logfileId)
  if (!auth.isAdmin) {
    logfileQuery = logfileQuery.eq('user_id', auth.user.id)
  }
  const { data: logfile } = await logfileQuery.single()

  if (!logfile) {
    return NextResponse.json({ error: 'Logfile not found' }, { status: 404 })
  }

  const { data, error, count } = await supabaseAdmin
    .from('measurements')
    .select('*', { count: 'exact' })
    .eq('logfile_id', logfileId)
    .order('timestamp', { ascending: true })
    .range((page - 1) * limit, page * limit - 1)

  if (error) {
    console.error('Measurements fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch measurements' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    measurements: data,
    pagination: { page, limit, total: count || 0 },
  })
}

/**
 * POST /api/measurements — bulk import measurements for an existing session
 * Body: { logfile_id: number, measurements: MeasurementInput[] }
 *
 * Bootstrap import target for the web drag-and-drop flow, and the
 * endpoint the Android app will call for auto-sync in Phase 1b.
 * user_id and nha_mang are never trusted from client input for
 * anything security-relevant — user_id is always the authenticated
 * caller; nha_mang here is the value the app derived from MCC/MNC and
 * is stored as reported (objective per-record fact, not the same
 * concept as cellfiles.nha_mang per SOP §4.4).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const logfileId = body.logfile_id
    const rows: unknown[] = Array.isArray(body.measurements) ? body.measurements : []

    if (!logfileId) {
      return NextResponse.json({ error: 'logfile_id is required' }, { status: 400 })
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'measurements array is required and must not be empty' }, { status: 400 })
    }

    if (rows.length > 10000) {
      return NextResponse.json({ error: 'Maximum 10000 rows per import — split into multiple requests' }, { status: 400 })
    }

    // Verify the logfile belongs to the caller
    const { data: logfile } = await supabaseAdmin
      .from('logfiles')
      .select('id')
      .eq('id', logfileId)
      .eq('user_id', auth.user.id)
      .single()

    if (!logfile) {
      return NextResponse.json({ error: 'Logfile not found or not owned by you' }, { status: 404 })
    }

    for (let i = 0; i < rows.length; i++) {
      const result = validateMeasurement(rows[i], i)
      if (!result.valid) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
    }

    const inserts = (rows as MeasurementInput[]).map((r) => ({
      logfile_id: logfileId,
      user_id: auth.user.id,
      timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
      latitude: r.latitude ?? null,
      longitude: r.longitude ?? null,
      cell_id: r.cell_id?.trim() || null,
      cell_name: r.cell_name?.trim() || null,
      pci: typeof r.pci === 'number' ? r.pci : null,
      rsrp: typeof r.rsrp === 'number' ? r.rsrp : null,
      rsrq: typeof r.rsrq === 'number' ? r.rsrq : null,
      sinr: typeof r.sinr === 'number' ? r.sinr : null,
      rat: r.rat || null,
      band: r.band?.trim() || null,
      mcc: typeof r.mcc === 'number' ? r.mcc : null,
      mnc: typeof r.mnc === 'number' ? r.mnc : null,
      nha_mang: r.nha_mang || null,
      download_speed_mbps: typeof r.download_speed_mbps === 'number' ? r.download_speed_mbps : null,
      upload_speed_mbps: typeof r.upload_speed_mbps === 'number' ? r.upload_speed_mbps : null,
      latitude_accuracy: typeof r.latitude_accuracy === 'number' ? r.latitude_accuracy : null,
    }))

    const { data, error } = await supabaseAdmin
      .from('measurements')
      .insert(inserts)
      .select('id')

    if (error) {
      console.error('Measurements insert error:', error)
      return NextResponse.json({ error: 'Failed to import measurements' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        imported: data?.length || 0,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Measurements POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
