import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET /api/logfiles — list the caller's own measurement sessions
 * Query params: page (default 1), limit (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))

  const { data, error, count } = await supabaseAdmin
    .from('logfiles')
    .select('*, measurements(count)', { count: 'exact' })
    .eq('user_id', auth.user.id)
    .order('session_date', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) {
    console.error('Logfiles fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch logfiles' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    logfiles: data,
    pagination: { page, limit, total: count || 0 },
  })
}

/**
 * POST /api/logfiles — create a new measurement session
 * Body: { session_name: string, session_date?: string (ISO), device_info?: object, notes?: string }
 *
 * This is the bootstrap/manual-session-creation endpoint. To also import
 * measurements for this session in one call, use POST /api/measurements
 * with the returned logfile id right after.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const { session_name, session_date, device_info, notes } = body

    if (!session_name || typeof session_name !== 'string') {
      return NextResponse.json({ error: 'session_name is required' }, { status: 400 })
    }

    const insert: Record<string, unknown> = {
      user_id: auth.user.id,
      session_name: session_name.trim().slice(0, 200),
      notes: typeof notes === 'string' ? notes.trim().slice(0, 2000) : null,
      device_info: device_info && typeof device_info === 'object' ? device_info : null,
    }

    if (session_date) {
      const d = new Date(session_date)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'session_date must be a valid ISO date string' }, { status: 400 })
      }
      insert.session_date = d.toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('logfiles')
      .insert(insert)
      .select()
      .single()

    if (error) {
      console.error('Logfile insert error:', error)
      return NextResponse.json({ error: 'Failed to create logfile session' }, { status: 500 })
    }

    return NextResponse.json({ success: true, logfile: data }, { status: 201 })
  } catch (error) {
    console.error('Logfiles POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
