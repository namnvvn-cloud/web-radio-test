import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/api-auth'
import { createMomoOrder, isMomoConfigured } from '@/lib/payment/momo'
import { createVnpayOrder, isVnpayConfigured } from '@/lib/payment/vnpay'
import { getPaymentSettings } from '@/lib/payment/plans'

/**
 * POST /api/subscriptions/create-order — start a Pro upgrade payment.
 * Body: { method: 'momo' | 'vnpay' }
 *
 * Giá lấy từ payment_settings (Admin > Thanh toán), KHÔNG còn hằng số
 * cứng — xem lib/payment/plans.ts#getPaymentSettings. Cả 2 cổng vẫn là
 * scaffold: thiếu merchant key trong env thì trả 503 thay vì gọi ra
 * ngoài với credential rỗng. Chưa đổi subscription_tier ở đây — việc đó
 * chỉ xảy ra khi IPN xác nhận (xem .../momo/ipn, .../vnpay/ipn).
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

  const settings = await getPaymentSettings()
  if (!settings.paymentEnabled) {
    return NextResponse.json(
      { error: 'Hệ thống đang mở miễn phí toàn bộ tính năng, chưa cần thanh toán.' },
      { status: 409 }
    )
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

  const amountVnd = settings.monthlyPriceVnd

  const { data: row, error: insertError } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: auth.user.id,
      subscription_tier: 'pro',
      payment_method: method,
      payment_status: 'pending',
      amount_paid: amountVnd,
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
      amount: amountVnd,
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
    amount: amountVnd,
    orderInfo,
    ipAddr,
  })
  if (!result.ok) {
    await supabaseAdmin.from('subscriptions').update({ payment_status: 'failed' }).eq('id', row.id)
    return NextResponse.json({ error: result.error }, { status: 502 })
  }
  return NextResponse.json({ success: true, payUrl: result.payUrl, subscriptionId: row.id })
}
