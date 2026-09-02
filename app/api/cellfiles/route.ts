import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/api-auth'

const VALID_RAT = ['2G', '3G', '4G', '5G']
const VALID_OPERATORS = [
  'MobiFone', 'Viettel', 'VNPT', 'Vietnamobile',
  'Gmobile', 'Reddi', 'Elise', 'Itelecom', 'Wintel',
]

type CellfileInput = {
  site_name: string
  cell_name: string
  latitude: number
  longitude: number
  rat: string
  band?: string
  nha_mang?: string
  azimuth?: number
  radius?: number
  source_file?: string
}

function validateCellfile(row: unknown, index: number): { valid: boolean; error?: string } {
  const r = row as Partial<CellfileInput>

  if (!r.site_name || typeof r.site_name !== 'string') {
    return { valid: false, error: `Row ${index}: site_name is required` }
  }
  if (!r.cell_name || typeof r.cell_name !== 'string') {
    return { valid: false, error: `Row ${index}: cell_name is required` }
  }
  if (typeof r.latitude !== 'number' || r.latitude < -90 || r.latitude > 90) {
    return { valid: false, error: `Row ${index}: latitude must be a number between -90 and 90` }
  }
  if (typeof r.longitude !== 'number' || r.longitude < -180 || r.longitude > 180) {
    return { valid: false, error: `Row ${index}: longitude must be a number between -180 and 180` }
  }
  if (!r.rat || !VALID_RAT.includes(r.rat)) {
    return { valid: false, error: `Row ${index}: rat must be one of ${VALID_RAT.join(', ')}` }
  }
  if (r.nha_mang && !VALID_OPERATORS.includes(r.nha_mang)) {
    return { valid: false, error: `Row ${index}: nha_mang must be one of ${VALID_OPERATORS.join(', ')}` }
  }

  return { valid: true }
}

/**
 * GET /api/cellfiles — list the caller's own cellfiles
 * Query params: page (default 1), limit (default 50, max 200),
 *   nha_mang, rat (optional filters)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))
  const nhaMang = searchParams.get('nha_mang')
  const rat = searchParams.get('rat')

  let query = supabaseAdmin
    .from('cellfiles')
    .select('*', { count: 'exact' })
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (nhaMang) query = query.eq('nha_mang', nhaMang)
  if (rat) query = query.eq('rat', rat)

  const { data, error, count } = await query

  if (error) {
    console.error('Cellfiles fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch cellfiles' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    cellfiles: data,
    pagination: { page, limit, total: count || 0 },
  })
}

/**
 * POST /api/cellfiles — bulk import cellfile records
 * Body: { cellfiles: CellfileInput[], source_file?: string }
 *
 * This is the bootstrap import endpoint (drag-and-drop on the web) and
 * will also be what the Android app calls for auto-sync in Phase 1b.
 * Every row is force-attributed to the authenticated user — user_id
 * is never taken from the request body.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const rows: unknown[] = Array.isArray(body.cellfiles) ? body.cellfiles : []
    const sourceFile: string | undefined = typeof body.source_file === 'string' ? body.source_file : undefined

    if (rows.length === 0) {
      return NextResponse.json({ error: 'cellfiles array is required and must not be empty' }, { status: 400 })
    }

    if (rows.length > 5000) {
      return NextResponse.json({ error: 'Maximum 5000 rows per import — split into multiple requests' }, { status: 400 })
    }

    // Validate every row before inserting anything
    for (let i = 0; i < rows.length; i++) {
      const result = validateCellfile(rows[i], i)
      if (!result.valid) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
    }

    const inserts = (rows as CellfileInput[]).map((r) => ({
      user_id: auth.user.id,
      site_name: r.site_name.trim(),
      cell_name: r.cell_name.trim(),
      latitude: r.latitude,
      longitude: r.longitude,
      rat: r.rat,
      band: r.band?.trim() || null,
      nha_mang: r.nha_mang || null,
      azimuth: typeof r.azimuth === 'number' ? r.azimuth : null,
      radius: typeof r.radius === 'number' ? r.radius : null,
      source_file: r.source_file?.trim() || sourceFile || null,
    }))

    const { data, error } = await supabaseAdmin
      .from('cellfiles')
      .insert(inserts)
      .select('id')

    if (error) {
      console.error('Cellfiles insert error:', error)
      return NextResponse.json({ error: 'Failed to import cellfiles' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        imported: data?.length || 0,
        ids: data?.map((d) => d.id) || [],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Cellfiles POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
