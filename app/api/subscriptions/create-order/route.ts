import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/api-auth'
import { createMomoOrder, isMomoConfigured } from '@/lib/payment/momo'
import { createVnpayOrder, isVnpayConfigured } from '@/lib/payment/vnpay'
import { PRO_PLAN } from '@/lib/payment/plans'

/**
 * POST /api/subscriptions/create-order — start a Pro upgrade payment.
 * Body: { method: 'momo' | 'vnpay' }
 *
 * Creates a `pending` subscriptions row, then asks the chosen gateway
 * for a payUrl to redirect the user to. Both gateways are inactive
 * scaffolds: if merchant keys are not set in env vars, this returns 503
 * with a clear Vietnamese message instead of calling out with garbage
 * credentials. Nothing here changes subscription_tier — that only
 * happens once the gateway's IPN/webhook confirms payment (see
 * /api/subscriptions/momo/ipn and /api/subscriptions/vnpay/ipn).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const method = body.method
  if (method !== 'momo' && method !== 'vnpay') {
    return NextResponse.json({ error: "method must be 'momo' or 'vnpay'" }, { status: 400 })
  }

  if (method === 'momo' && !isMomoConfigured()) {
    return NextResponse.json(
      { error: 'Cổng thanh toán MoMo chưa được kích hoạt (đang chờ merchant keys).' },
      { status: 503 }
    )
  }
  if (method === 'vnpay' && !isVnpayConfigured()) {
    return NextResponse.json(
      { error: 'Cổng thanh toán VNPay chưa được kích hoạt (đang chờ merchant keys).' },
      { status: 503 }
    )
  }

  const { data: row, error: insertError } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: auth.user.id,
      subscription_tier: PRO_PLAN.tier,
      payment_method: method,
      payment_status: 'pending',
      amount_paid: PRO_PLAN.amountVnd,
    })
    .select()
    .single()

  if (insertError || !row) {
    console.error('Create subscription order error:', insertError)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  const orderInfo = `Nang cap Web Radio Test - Goi Pro - don hang #${row.id}`

  if (method === 'momo') {
    const result = await createMomoOrder({
      orderId: String(row.id),
      amount: PRO_PLAN.amountVnd,
      orderInfo,
    })
    if (!result.ok) {
      await supabaseAdmin.from('subscriptions').update({ payment_status: 'failed' }).eq('id', row.id)
      return NextResponse.json({ error: result.error }, { status: 502 })
    }
    await supabaseAdmin
      .from('subscriptions')
      .update({ transaction_id: result.requestId })
      .eq('id', row.id)
    return NextResponse.json({ success: true, payUrl: result.payUrl, subscriptionId: row.id })
  }

  // vnpay
  const ipAddr =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || '127.0.0.1'
  const result = createVnpayOrder({
    txnRef: `${row.id}-${Date.now()}`,
    amount: PRO_PLAN.amountVnd,
    orderInfo,
    ipAddr,
  })
  if (!result.ok) {
    await supabaseAdmin.from('subscriptions').update({ payment_status: 'failed' }).eq('id', row.id)
    return NextResponse.json({ error: result.error }, { status: 502 })
  }
  return NextResponse.json({ success: true, payUrl: result.payUrl, subscriptionId: row.id })
}
