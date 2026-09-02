import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const VALID_EVENTS = ['open', 'login_success', 'heartbeat']

/**
 * POST /api/pings — Phase 0.5 usage stats (SOP §4.1.1)
 * Fire-and-forget endpoint the app calls with a single small network
 * request. No auth required — device_id is the correlation key.
 *
 * Body: { deviceId: string (UUID), event: 'open'|'login_success'|'heartbeat',
 *         appVersion?: string, userId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceId, event, appVersion, userId } = body

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
    }

    if (!event || !VALID_EVENTS.includes(event)) {
      return NextResponse.json(
        { error: `event must be one of: ${VALID_EVENTS.join(', ')}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('app_pings')
      .insert({
        device_id: deviceId,
        event,
        app_version: appVersion || null,
        user_id: userId || null,
      })
      .select('id, created_at')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to insert ping record' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'POST to this endpoint with { deviceId, event, appVersion?, userId? }' },
    { status: 200 }
  )
}
