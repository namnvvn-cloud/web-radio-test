import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyVnpaySignature } from '@/lib/payment/vnpay'
import { PRO_PLAN } from '@/lib/payment/plans'

/**
 * GET /api/subscriptions/vnpay/ipn — server-to-server IPN VNPay calls
 * after a payment attempt (GET with query params, per VNPay spec). No
 * user auth — trust is established via vnp_SecureHash. Inactive until
 * VNPAY_HASH_SECRET is set (verifyVnpaySignature always returns false
 * without it).
 *
 * VNPay requires a specific JSON response shape:
 *   { RspCode: '00', Message: 'Confirm Success' } on success
 *   { RspCode: '97', Message: 'Invalid signature' } etc. on failure
 * See https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html#ipn
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const receivedHash = params.vnp_SecureHash
  delete params.vnp_SecureHash
  delete params.vnp_SecureHashType

  if (!receivedHash || !verifyVnpaySignature(params, receivedHash)) {
    console.error('VNPay IPN: invalid signature', params.vnp_TxnRef)
    return NextResponse.json({ RspCode: '97', Message: 'Invalid signature' })
  }

  // vnp_TxnRef was created as `${subscriptionId}-${timestamp}`.
  const subscriptionId = Number(String(params.vnp_TxnRef).split('-')[0])
  if (!Number.isInteger(subscriptionId)) {
    return NextResponse.json({ RspCode: '01', Message: 'Order not found' })
  }

  const { data: row } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id, payment_status')
    .eq('id', subscriptionId)
    .single()

  if (!row) {
    return NextResponse.json({ RspCode: '01', Message: 'Order not found' })
  }

  // Already processed — VNPay may retry the IPN; stay idempotent.
  if (row.payment_status === 'completed') {
    return NextResponse.json({ RspCode: '02', Message: 'Order already confirmed' })
  }

  if (params.vnp_ResponseCode !== '00') {
    await supabaseAdmin
      .from('subscriptions')
      .update({ payment_status: 'failed', transaction_id: params.vnp_TransactionNo || null })
      .eq('id', subscriptionId)
    return NextResponse.json({ RspCode: '00', Message: 'Confirm Success' })
  }

  const now = new Date()
  const end = new Date(now.getTime() + PRO_PLAN.billingCycleDays * 24 * 60 * 60 * 1000)

  await supabaseAdmin
    .from('subscriptions')
    .update({
      payment_status: 'completed',
      transaction_id: params.vnp_TransactionNo || null,
      billing_cycle_start: now.toISOString(),
      billing_cycle_end: end.toISOString(),
    })
    .eq('id', subscriptionId)

  await supabaseAdmin
    .from('profiles')
    .update({ subscription_tier: 'pro', updated_at: now.toISOString() })
    .eq('id', row.user_id)

  return NextResponse.json({ RspCode: '00', Message: 'Confirm Success' })
}
