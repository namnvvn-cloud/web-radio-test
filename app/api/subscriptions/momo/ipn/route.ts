import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyMomoIpnSignature, type MomoIpnPayload } from '@/lib/payment/momo'
import { PRO_PLAN } from '@/lib/payment/plans'

/**
 * POST /api/subscriptions/momo/ipn — server-to-server callback MoMo
 * calls after a payment attempt. No user auth (MoMo can't send a Bearer
 * token) — trust is established purely via the HMAC signature. Inactive
 * until MOMO_SECRET_KEY is set (verifyMomoIpnSignature always returns
 * false without it, so an unconfigured deployment safely rejects
 * everything here rather than trusting an unverifiable payload).
 *
 * MoMo requires this endpoint to always return { resultCode } quickly;
 * see https://developers.momo.vn/v3/docs/payment/api/wallet/onetime
 */
export async function POST(request: NextRequest) {
  let payload: MomoIpnPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ resultCode: 1, message: 'Invalid JSON' }, { status: 400 })
  }

  if (!verifyMomoIpnSignature(payload)) {
    console.error('MoMo IPN: invalid signature', payload.orderId)
    return NextResponse.json({ resultCode: 1, message: 'Invalid signature' }, { status: 400 })
  }

  const subscriptionId = Number(payload.orderId)
  if (!Number.isInteger(subscriptionId)) {
    return NextResponse.json({ resultCode: 1, message: 'Invalid orderId' }, { status: 400 })
  }

  const { data: row } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id, payment_status')
    .eq('id', subscriptionId)
    .single()

  if (!row) {
    return NextResponse.json({ resultCode: 1, message: 'Order not found' }, { status: 404 })
  }

  // Already processed — MoMo may retry the IPN; stay idempotent.
  if (row.payment_status === 'completed') {
    return NextResponse.json({ resultCode: 0, message: 'Already processed' })
  }

  if (payload.resultCode !== 0) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ payment_status: 'failed', transaction_id: String(payload.transId) })
      .eq('id', subscriptionId)
    return NextResponse.json({ resultCode: 0, message: 'Received (payment failed)' })
  }

  const now = new Date()
  const end = new Date(now.getTime() + PRO_PLAN.billingCycleDays * 24 * 60 * 60 * 1000)

  await supabaseAdmin
    .from('subscriptions')
    .update({
      payment_status: 'completed',
      transaction_id: String(payload.transId),
      billing_cycle_start: now.toISOString(),
      billing_cycle_end: end.toISOString(),
    })
    .eq('id', subscriptionId)

  await supabaseAdmin
    .from('profiles')
    .update({ subscription_tier: 'pro', updated_at: now.toISOString() })
    .eq('id', row.user_id)

  return NextResponse.json({ resultCode: 0, message: 'Success' })
}
