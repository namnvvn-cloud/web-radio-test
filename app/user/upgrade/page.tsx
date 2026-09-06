'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'
import { VN_BANKS } from '@/lib/payment/banks'
import type { PaymentRequest } from '@/lib/types'

type Subscription = {
  id: number
  subscription_tier: 'free' | 'pro'
  payment_method: string | null
  payment_status: 'pending' | 'completed' | 'failed' | 'cancelled'
  billing_cycle_end: string | null
} | null

type SubscriptionsResponse = {
  currentTier: 'free' | 'pro'
  subscription: Subscription
  plan: { amountVnd: number; billingCycleDays: number }
  paymentEnabled: boolean
  gateways: { momo: boolean; vnpay: boolean }
}

type PaymentSettingsResponse = {
  paymentEnabled: boolean
  monthlyPriceVnd: number
  bank: { bankName: string | null; accountNumber: string | null; accountName: string | null; branch: string | null }
  usd: { amount: number; rate: number; rateSource: string; rateFetchedAt: string | null }
  gateways: { momo: boolean; vnpay: boolean }
}

type Method = 'bank_transfer' | 'momo' | 'vnpay' | 'atm_card' | 'visa'

const METHOD_LABEL: Record<Method, string> = {
  bank_transfer: 'Chuyển khoản ngân hàng',
  momo: 'MoMo',
  vnpay: 'VNPay',
  atm_card: 'Thẻ nội địa (ATM)',
  visa: 'Thẻ Visa (USD)',
}

export default function UpgradePage() {
  const { user } = useAuth()
  const [data, setData] = useState<SubscriptionsResponse | null>(null)
  const [payment, setPayment] = useState<PaymentSettingsResponse | null>(null)
  const [myRequests, setMyRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<Method | null>(null)
  const [atmBank, setAtmBank] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [starting, setStarting] = useState<'momo' | 'vnpay' | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [subRes, paymentRes, requestsRes] = await Promise.all([
      apiFetch<SubscriptionsResponse>('/api/subscriptions'),
      apiFetch<PaymentSettingsResponse>('/api/payment-settings'),
      apiFetch<{ requests: PaymentRequest[] }>('/api/payments/requests'),
    ])
    if (subRes.ok && subRes.data) setData(subRes.data)
    else setError(subRes.error || 'Không tải được thông tin gói')
    if (paymentRes.ok && paymentRes.data) setPayment(paymentRes.data)
    if (requestsRes.ok && requestsRes.data) setMyRequests(requestsRes.data.requests)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user, loadAll])

  const isPro = data?.currentTier === 'pro'
  const paymentEnabled = payment?.paymentEnabled ?? data?.paymentEnabled ?? false

  const pendingRequestFor = (method: Method) => myRequests.find((r) => r.method === method && r.status === 'pending')

  const handleGatewayUpgrade = async (method: 'momo' | 'vnpay') => {
    setStarting(method)
    setError(null)
    const res = await apiFetch<{ payUrl: string }>('/api/subscriptions/create-order', {
      method: 'POST',
      body: JSON.stringify({ method }),
    })
    if (res.ok && res.data?.payUrl) {
      window.location.href = res.data.payUrl
      return
    }
    setError(res.error || 'Không tạo được đơn hàng')
    setStarting(null)
  }

  const handleManualSubmit = async (method: 'bank_transfer' | 'atm_card' | 'visa') => {
    if (method === 'atm_card' && !atmBank) {
      setError('Vui lòng chọn ngân hàng')
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await apiFetch<{ request: PaymentRequest }>('/api/payments/requests', {
      method: 'POST',
      body: JSON.stringify({ method, ...(method === 'atm_card' ? { bankSelected: atmBank } : {}) }),
    })
    if (res.ok && res.data) {
      setMyRequests((prev) => [res.data!.request, ...prev])
    } else {
      setError(res.error || 'Không tạo được yêu cầu thanh toán')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <p className="text-gray-500 text-sm py-4">Đang tải…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nâng cấp gói</h1>
        <p className="text-gray-600">So sánh gói Free và Pro.</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!paymentEnabled ? (
        <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center space-y-2">
          <p className="text-lg font-semibold text-green-800">Toàn bộ tính năng đang MIỄN PHÍ</p>
          <p className="text-sm text-green-700">
            Hệ thống hiện chưa bật thu phí. Bạn có thể dùng đầy đủ tính năng mà không cần thanh toán.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Free</h2>
            <p className="text-2xl font-bold text-gray-900">0đ</p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Đo sóng &amp; lưu lịch sử cơ bản</li>
              <li>Upload cell file, xem báo cáo cơ bản</li>
            </ul>
            {!isPro && <p className="text-xs font-medium text-blue-600 pt-2">Gói hiện tại của bạn</p>}
          </div>

          <div className="rounded-lg bg-white p-6 shadow space-y-3 border-2 border-blue-500">
            <h2 className="text-lg font-semibold text-gray-900">Pro</h2>
            <p className="text-2xl font-bold text-gray-900">
              {(payment?.monthlyPriceVnd ?? data?.plan.amountVnd ?? 0).toLocaleString('vi-VN')}đ
              <span className="text-sm font-normal text-gray-500"> / {data?.plan.billingCycleDays ?? 30} ngày</span>
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Toàn bộ tính năng Free</li>
              <li>Báo cáo nâng cao, xuất Excel không giới hạn</li>
              <li>Ưu tiên hỗ trợ</li>
            </ul>
            {isPro && (
              <p className="text-xs font-medium text-green-600 pt-2">
                Đang dùng gói Pro
                {data?.subscription?.billing_cycle_end &&
                  ` (đến ${new Date(data.subscription.billing_cycle_end).toLocaleDateString('vi-VN')})`}
              </p>
            )}
          </div>
        </div>
      )}

      {paymentEnabled && !isPro && (
        <div className="rounded-lg bg-white p-6 shadow space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Chọn phương thức thanh toán</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(['bank_transfer', 'momo', 'vnpay', 'atm_card', 'visa'] as Method[]).map((m) => {
              const isGateway = m === 'momo' || m === 'vnpay'
              const comingSoon = isGateway && !payment?.gateways[m]
              const pending = pendingRequestFor(m)
              return (
                <button
                  key={m}
                  type="button"
                  disabled={comingSoon}
                  onClick={() => setSelected(m)}
                  className={`text-left rounded-lg border-2 p-4 transition-colors ${
                    selected === m ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  } ${comingSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{METHOD_LABEL[m]}</span>
                    {comingSoon && (
                      <span className="text-xs rounded-full bg-gray-200 text-gray-600 px-2 py-0.5">Sắp ra mắt</span>
                    )}
                    {pending && (
                      <span className="text-xs rounded-full bg-amber-100 text-amber-700 px-2 py-0.5">Đang chờ duyệt</span>
                    )}
                  </div>
                  {m === 'visa' && payment && (
                    <p className="text-xs text-gray-500 mt-1">≈ {payment.usd.amount} USD</p>
                  )}
                </button>
              )
            })}
          </div>

          {selected === 'bank_transfer' && (
            <div className="rounded-md bg-gray-50 p-4 space-y-2 text-sm">
              {pendingRequestFor('bank_transfer') ? (
                <p className="text-amber-700">
                  Đã ghi nhận yêu cầu, mã đơn <strong>{pendingRequestFor('bank_transfer')!.order_code}</strong> — đang
                  chờ admin xác nhận.
                </p>
              ) : payment?.bank.accountNumber ? (
                <>
                  <p>
                    Ngân hàng: <strong>{payment.bank.bankName}</strong>
                  </p>
                  <p>
                    Số tài khoản: <strong>{payment.bank.accountNumber}</strong>
                  </p>
                  <p>
                    Chủ tài khoản: <strong>{payment.bank.accountName}</strong>
                  </p>
                  {payment.bank.branch && <p>Chi nhánh: {payment.bank.branch}</p>}
                  <p>
                    Số tiền: <strong>{payment.monthlyPriceVnd.toLocaleString('vi-VN')}đ</strong>
                  </p>
                  <p className="text-gray-500">
                    Chuyển khoản xong, bấm nút bên dưới để báo admin — hệ thống cấp mã đơn để bạn ghi vào nội dung
                    chuyển khoản lần sau nếu cần đối chiếu.
                  </p>
                  <button
                    onClick={() => handleManualSubmit('bank_transfer')}
                    disabled={submitting}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Đang gửi…' : 'Tôi đã chuyển khoản'}
                  </button>
                </>
              ) : (
                <p className="text-red-600">Admin chưa cấu hình tài khoản nhận tiền.</p>
              )}
            </div>
          )}

          {selected === 'atm_card' && (
            <div className="rounded-md bg-gray-50 p-4 space-y-2 text-sm">
              {pendingRequestFor('atm_card') ? (
                <p className="text-amber-700">
                  Đã ghi nhận yêu cầu, mã đơn <strong>{pendingRequestFor('atm_card')!.order_code}</strong> — đang chờ
                  admin xác nhận.
                </p>
              ) : (
                <>
                  <label className="block font-medium text-gray-700">Chọn ngân hàng phát hành thẻ</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 bg-white"
                    value={atmBank}
                    onChange={(e) => setAtmBank(e.target.value)}
                  >
                    <option value="">-- Chọn ngân hàng --</option>
                    {VN_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-gray-500">
                    Thanh toán trực tiếp bằng thẻ ATM chưa hỗ trợ tự động — bạn chuyển khoản{' '}
                    {payment?.monthlyPriceVnd.toLocaleString('vi-VN')}đ tới tài khoản admin (xem mục Chuyển khoản
                    ngân hàng) rồi bấm xác nhận bên dưới.
                  </p>
                  <button
                    onClick={() => handleManualSubmit('atm_card')}
                    disabled={submitting || !atmBank}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Đang gửi…' : 'Tôi đã thanh toán'}
                  </button>
                </>
              )}
            </div>
          )}

          {selected === 'visa' && (
            <div className="rounded-md bg-gray-50 p-4 space-y-2 text-sm">
              {pendingRequestFor('visa') ? (
                <p className="text-amber-700">
                  Đã ghi nhận yêu cầu, mã đơn <strong>{pendingRequestFor('visa')!.order_code}</strong> — đang chờ
                  admin xác nhận.
                </p>
              ) : (
                <>
                  <p>
                    Số tiền quy đổi: <strong>{payment?.usd.amount} USD</strong> (tỷ giá{' '}
                    {payment?.usd.rate.toLocaleString('vi-VN')}đ/USD)
                  </p>
                  <p className="text-gray-500">
                    Chưa hỗ trợ quẹt thẻ Visa trực tiếp — vui lòng chuyển khoản quốc tế quy đổi tương đương rồi bấm
                    xác nhận bên dưới, admin sẽ đối chiếu.
                  </p>
                  <button
                    onClick={() => handleManualSubmit('visa')}
                    disabled={submitting}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Đang gửi…' : 'Tôi đã thanh toán'}
                  </button>
                </>
              )}
            </div>
          )}

          {selected === 'momo' && (
            <div className="rounded-md bg-gray-50 p-4">
              <button
                onClick={() => handleGatewayUpgrade('momo')}
                disabled={!payment?.gateways.momo || starting !== null}
                className="w-full rounded-lg bg-pink-600 px-4 py-2 font-medium text-white hover:bg-pink-700 disabled:opacity-50"
              >
                {starting === 'momo' ? 'Đang chuyển hướng…' : 'Thanh toán qua MoMo'}
              </button>
            </div>
          )}

          {selected === 'vnpay' && (
            <div className="rounded-md bg-gray-50 p-4">
              <button
                onClick={() => handleGatewayUpgrade('vnpay')}
                disabled={!payment?.gateways.vnpay || starting !== null}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {starting === 'vnpay' ? 'Đang chuyển hướng…' : 'Thanh toán qua VNPay'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
