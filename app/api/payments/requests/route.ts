import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/api-auth'
import { getPaymentSettings } from '@/lib/payment/plans'
import { getUsdToVndRate, vndToUsd } from '@/lib/payment/fx'
import { VN_BANKS } from '@/lib/payment/banks'

const METHODS = ['bank_transfer', 'momo', 'vnpay', 'atm_card', 'visa'] as const
type Method = (typeof METHODS)[number]

// Chỉ bank_transfer thực sự xử lý (báo tay + admin duyệt). 4 phương thức
// còn lại hiện UI đầy đủ nhưng chưa có merchant key thật -- xem
// lib/payment/momo.ts / vnpay.ts. atm_card/visa cũng tạm đi qua flow này
// (báo tay) để không chặn người dùng muốn thử, admin tự xác minh thủ công.
const LIVE_METHODS: Method[] = ['bank_transfer', 'atm_card', 'visa']

function genOrderCode(userId: string): string {
  return `RT-${userId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
}

/**
 * GET /api/payments/requests — lịch sử yêu cầu thanh toán của chính user
 * đang đăng nhập (mới nhất trước).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data, error } = await supabaseAdmin
    .from('payment_requests')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('payment_requests fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch payment requests' }, { status: 500 })
  }

  return NextResponse.json({ success: true, requests: data })
}

/**
 * POST /api/payments/requests — user báo "tôi đã thanh toán" cho một
 * phương thức không có webhook tự động. Body: { method, bankSelected? }.
 * Ghi lại 1 dòng "pending", admin duyệt tại Admin > Thanh toán (PATCH
 * /api/admin/payments/requests/[id]) mới thật sự nâng subscription_tier.
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

  const method = body.method as Method
  if (!METHODS.includes(method)) {
    return NextResponse.json({ error: `method phải thuộc: ${METHODS.join(', ')}` }, { status: 400 })
  }
  if (!LIVE_METHODS.includes(method)) {
    return NextResponse.json(
      { error: 'Phương thức này sắp ra mắt, vui lòng dùng Chuyển khoản ngân hàng.' },
      { status: 503 }
    )
  }

  const settings = await getPaymentSettings()
  if (!settings.paymentEnabled) {
    return NextResponse.json(
      { error: 'Hệ thống đang mở miễn phí toàn bộ tính năng, chưa cần thanh toán.' },
      { status: 409 }
    )
  }

  let bankSelected: string | null = null
  if (method === 'atm_card') {
    const code = typeof body.bankSelected === 'string' ? body.bankSelected : ''
    if (!VN_BANKS.some((b) => b.code === code)) {
      return NextResponse.json({ error: 'Vui lòng chọn ngân hàng hợp lệ' }, { status: 400 })
    }
    bankSelected = code
  }

  let amountUsd: number | null = null
  let fxRate: number | null = null
  if (method === 'visa') {
    const fx = await getUsdToVndRate()
    fxRate = fx.rate
    amountUsd = vndToUsd(settings.monthlyPriceVnd, fx.rate, settings.usdMarkupPercent)
  }

  const orderCode = genOrderCode(auth.user.id)

  const { data, error } = await supabaseAdmin
    .from('payment_requests')
    .insert({
      user_id: auth.user.id,
      method,
      bank_selected: bankSelected,
      amount_vnd: settings.monthlyPriceVnd,
      amount_usd: amountUsd,
      fx_rate: fxRate,
      order_code: orderCode,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Create payment request error:', error)
    return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 })
  }

  return NextResponse.json({ success: true, request: data })
}
