import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/api-auth'

const VALID_OPERATORS = [
  'MobiFone', 'Viettel', 'VNPT', 'Vietnamobile',
  'Gmobile', 'Reddi', 'Elise', 'Itelecom', 'Wintel',
]

/**
 * GET /api/profile — fetch the caller's own profile
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .single()

  if (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, profile: data })
}

/**
 * PATCH /api/profile — update the caller's own profile
 * Allowed fields: full_name, phone_number, nha_mang_mac_dinh
 * (email, role, subscription_tier are NOT editable here)
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (typeof body.full_name === 'string') {
      updates.full_name = body.full_name.trim().slice(0, 200)
    }

    if (typeof body.phone_number === 'string') {
      updates.phone_number = body.phone_number.trim().slice(0, 30)
    }

    if (typeof body.nha_mang_mac_dinh === 'string') {
      if (!VALID_OPERATORS.includes(body.nha_mang_mac_dinh)) {
        return NextResponse.json(
          { error: `nha_mang_mac_dinh must be one of: ${VALID_OPERATORS.join(', ')}` },
          { status: 400 }
        )
      }
      updates.nha_mang_mac_dinh = body.nha_mang_mac_dinh
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', auth.user.id)
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: data })
  } catch (error) {
    console.error('Profile PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
