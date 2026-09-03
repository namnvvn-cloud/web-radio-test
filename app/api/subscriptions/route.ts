import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/api-auth'
import { isMomoConfigured } from '@/lib/payment/momo'
import { isVnpayConfigured } from '@/lib/payment/vnpay'
import { PRO_PLAN } from '@/lib/payment/plans'

/**
 * GET /api/subscriptions — current user's latest subscription row (if
 * any) + which gateways are actually configured, so the upgrade UI can
 * show "Sắp ra mắt" instead of a dead button. Auth required (any role).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const [{ data, error }, { data: profile, error: profileError }] = await Promise.all([
    supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin.from('profiles').select('subscription_tier').eq('id', auth.user.id).single(),
  ])

  if (error || profileError) {
    console.error('Subscriptions fetch error:', error || profileError)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    // Source of truth for "is this user Pro right now" — set by the
    // IPN handlers, not derived from payment_status (a `pending` or
    // `failed` newest row must not make an existing Pro user look Free).
    currentTier: profile?.subscription_tier || 'free',
    subscription: data,
    plan: PRO_PLAN,
    gateways: {
      momo: isMomoConfigured(),
      vnpay: isVnpayConfigured(),
    },
  })
}
