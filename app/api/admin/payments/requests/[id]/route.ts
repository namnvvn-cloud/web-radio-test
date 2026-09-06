import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin, logAudit } from '@/lib/api-auth'
import { PRO_PLAN } from '@/lib/payment/plans'

/**
 * PATCH /api/admin/payments/requests/[id] — duyệt hoặc từ chối 1 yêu
 * cầu thanh toán thủ công (bank_transfer / atm_card / visa — các
 * phương thức chưa có webhook tự động, xem app/api/payments/requests).
 * Body: { action: 'approve' | 'reject', note? }
 *
 * Khi approve: set profiles.subscription_tier = 'pro', tạo 1 dòng
 * subscriptions 'completed' với billing_cycle_end = now() + 30 ngày —
 * cùng cơ chế /api/cron/expire-subscriptions dùng để tự hạ về Free khi
 * hết hạn, giống hệt luồng MoMo/VNPay IPN.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const action = body.action
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: "action phải là 'approve' hoặc 'reject'" }, { status: 400 })
  }
  const note = typeof body.note === 'string' ? body.note.trim() : null

  const { data: reqRow, error: fetchErr } = await supabaseAdmin
    .from('payment_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !reqRow) {
    return NextResponse.json({ error: 'Không tìm thấy yêu cầu thanh toán' }, { status: 404 })
  }
  if (reqRow.status !== 'pending') {
    return NextResponse.json({ error: `Yêu cầu này đã được xử lý (${reqRow.status})` }, { status: 409 })
  }

  const now = new Date().toISOString()

  const { error: updateErr } = await supabaseAdmin
    .from('payment_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: now,
      reviewed_by: auth.user.id,
      note,
    })
    .eq('id', id)

  if (updateErr) {
    console.error('Payment request update error:', updateErr)
    return NextResponse.json({ error: 'Failed to update payment request' }, { status: 500 })
  }

  if (action === 'approve') {
    const start = new Date()
    const end = new Date(start.getTime() + PRO_PLAN.billingCycleDays * 24 * 60 * 60 * 1000)

    const { error: subErr } = await supabaseAdmin.from('subscriptions').insert({
      user_id: reqRow.user_id,
      subscription_tier: 'pro',
      payment_method: reqRow.method,
      payment_status: 'completed',
      transaction_id: reqRow.order_code,
      billing_cycle_start: start.toISOString(),
      billing_cycle_end: end.toISOString(),
      amount_paid: reqRow.amount_vnd,
    })

    if (subErr) {
      console.error('Create subscription on approve error:', subErr)
      return NextResponse.json({ error: 'Duyệt thất bại khi tạo subscription' }, { status: 500 })
    }

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({ subscription_tier: 'pro', updated_at: now })
      .eq('id', reqRow.user_id)

    if (profileErr) {
      console.error('Upgrade profile on approve error:', profileErr)
      return NextResponse.json({ error: 'Duyệt thất bại khi nâng cấp tài khoản' }, { status: 500 })
    }
  }

  await logAudit(auth.user.id, action === 'approve' ? 'payment_request_approved' : 'payment_request_rejected', 'payment_requests', id, {
    order_code: reqRow.order_code,
    user_id: reqRow.user_id,
    amount_vnd: reqRow.amount_vnd,
    note,
  })

  return NextResponse.json({ success: true })
}
