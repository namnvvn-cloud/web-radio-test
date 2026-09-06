import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Giá gói Pro mặc định — chỉ dùng khi bảng payment_settings chưa có
 * dòng nào (không nên xảy ra vì migration 010 đã insert sẵn id=1).
 * Giá THẬT admin cấu hình trong Admin > Thanh toán (payment_settings.monthly_price_vnd).
 */
export const PRO_PLAN = {
  tier: 'pro' as const,
  amountVnd: 99000,
  billingCycleDays: 30,
}

export type PaymentSettings = {
  paymentEnabled: boolean
  monthlyPriceVnd: number
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
  bankBranch: string | null
  momoPhone: string | null
  vnpayNote: string | null
  usdMarkupPercent: number
  updatedAt: string | null
}

/**
 * Đọc payment_settings (server-side, service role). Nguồn giá/tài khoản
 * nhận tiền duy nhất — mọi nơi tạo đơn hàng (create-order, payment
 * requests) đều phải gọi hàm này thay vì dùng PRO_PLAN.amountVnd cứng.
 */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  const { data, error } = await supabaseAdmin.from('payment_settings').select('*').eq('id', 1).maybeSingle()

  if (error || !data) {
    if (error) console.error('getPaymentSettings error:', error)
    return {
      paymentEnabled: false,
      monthlyPriceVnd: PRO_PLAN.amountVnd,
      bankName: null,
      bankAccountNumber: null,
      bankAccountName: null,
      bankBranch: null,
      momoPhone: null,
      vnpayNote: null,
      usdMarkupPercent: 0,
      updatedAt: null,
    }
  }

  return {
    paymentEnabled: Boolean(data.payment_enabled),
    monthlyPriceVnd: data.monthly_price_vnd ?? PRO_PLAN.amountVnd,
    bankName: data.bank_name,
    bankAccountNumber: data.bank_account_number,
    bankAccountName: data.bank_account_name,
    bankBranch: data.bank_branch,
    momoPhone: data.momo_phone,
    vnpayNote: data.vnpay_note,
    usdMarkupPercent: Number(data.usd_markup_percent) || 0,
    updatedAt: data.updated_at,
  }
}
