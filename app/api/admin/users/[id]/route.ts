import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/api-auth'

const VALID_ROLES = ['user', 'admin']
const VALID_TIERS = ['free', 'pro']

/**
 * PATCH /api/admin/users/[id] — update a user's role or subscription tier
 * Admin-only. Body: { role?: 'user' | 'admin', subscription_tier?: 'free' | 'pro' }
 * Every change is written to audit_log with before/after values.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.role !== undefined) {
      if (!VALID_ROLES.includes(body.role)) {
        return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
      }
      updates.role = body.role
    }

    if (body.subscription_tier !== undefined) {
      if (!VALID_TIERS.includes(body.subscription_tier)) {
        return NextResponse.json({ error: `subscription_tier must be one of: ${VALID_TIERS.join(', ')}` }, { status: 400 })
      }
      updates.subscription_tier = body.subscription_tier
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update (role, subscription_tier)' }, { status: 400 })
    }

    // Prevent admins from demoting themselves and getting locked out
    if (id === auth.user.id && updates.role === 'user') {
      return NextResponse.json({ error: 'You cannot remove your own admin role' }, { status: 400 })
    }

    const { data: before } = await supabaseAdmin
      .from('profiles')
      .select('role, subscription_tier')
      .eq('id', id)
      .single()

    if (!before) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Admin user update error:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    await logAudit(auth.user.id, 'user_updated', 'profiles', id, {
      before,
      after: updates,
    })

    return NextResponse.json({ success: true, profile: data })
  } catch (error) {
    console.error('Admin user PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/admin/users/[id] — fetch one user's profile
 * Admin-only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', id).single()

  if (error || !data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, profile: data })
}
