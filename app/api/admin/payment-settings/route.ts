import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin, logAudit } from '@/lib/api-auth'
import { VN_BANKS } from '@/lib/payment/banks'
import { getUsdToVndRate } from '@/lib/payment/fx'

/**
 * Admin API for public.payment_settings (Admin Panel > Thanh toán, mục
 * (1)(2)(3) theo yêu cầu 06/09/2026): bật/tắt thu phí, giá gói/tháng,
 * tài khoản ngân hàng nhận tiền. Đây là NGUỒN DUY NHẤT các nơi khác
 * (create-order, /api/payment-settings, payment requests) đọc giá —
 * xem lib/payment/plans.ts#getPaymentSettings.
 */

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data, error } = await supabaseAdmin.from('payment_settings').select('*').eq('id', 1).maybeSingle()
  if (error) {
    console.error('Admin payment-settings fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch payment settings' }, { status: 500 })
  }

  const fx = await getUsdToVndRate()

  return NextResponse.json({
    success: true,
    settings: data,
    banks: VN_BANKS,
    fx,
  })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const paymentEnabled = Boolean(body.paymentEnabled)
  const monthlyPriceVnd = Number(body.monthlyPriceVnd)
  const bankName = typeof body.bankName === 'string' ? body.bankName.trim() : null
  const bankAccountNumber = typeof body.bankAccountNumber === 'string' ? body.bankAccountNumber.trim() : null
  const bankAccountName = typeof body.bankAccountName === 'string' ? body.bankAccountName.trim() : null
  const bankBranch = typeof body.bankBranch === 'string' ? body.bankBranch.trim() : null
  const momoPhone = typeof body.momoPhone === 'string' ? body.momoPhone.trim() : null
  const vnpayNote = typeof body.vnpayNote === 'string' ? body.vnpayNote.trim() : null
  const usdMarkupPercent = Number(body.usdMarkupPercent) || 0

  if (!Number.isInteger(monthlyPriceVnd) || monthlyPriceVnd < 0) {
    return NextResponse.json({ error: 'monthlyPriceVnd phải là số nguyên >= 0' }, { status: 400 })
  }
  if (paymentEnabled && (!bankAccountNumber || !bankAccountName || !bankName)) {
    return NextResponse.json(
      { error: 'Cần nhập đủ Ngân hàng, Số tài khoản, Tên chủ tài khoản trước khi kích hoạt thu phí' },
      { status: 400 }
    )
  }

  const { data: before } = await supabaseAdmin.from('payment_settings').select('*').eq('id', 1).maybeSingle()

  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('payment_settings')
    .upsert(
      {
        id: 1,
        payment_enabled: paymentEnabled,
        monthly_price_vnd: monthlyPriceVnd,
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_name: bankAccountName,
        bank_branch: bankBranch,
        momo_phone: momoPhone,
        vnpay_note: vnpayNote,
        usd_markup_percent: usdMarkupPercent,
        updated_at: now,
        updated_by: auth.user.id,
      },
      { onConflict: 'id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Admin payment-settings update error:', error)
    return NextResponse.json({ error: 'Failed to update payment settings' }, { status: 500 })
  }

  await logAudit(auth.user.id, 'payment_settings_updated', 'payment_settings', '1', {
    before,
    after: data,
  })

  return NextResponse.json({ success: true, settings: data })
}
