'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'

type Subscription = {
  id: number
  subscription_tier: 'free' | 'pro'
  payment_method: 'momo' | 'vnpay' | 'stripe' | 'none' | null
  payment_status: 'pending' | 'completed' | 'failed' | 'cancelled'
  billing_cycle_end: string | null
} | null

type SubscriptionsResponse = {
  currentTier: 'free' | 'pro'
  subscription: Subscription
  plan: { amountVnd: number; billingCycleDays: number; label: string }
  gateways: { momo: boolean; vnpay: boolean }
}

export default function UpgradePage() {
  const { user } = useAuth()
  const [data, setData] = useState<SubscriptionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<'momo' | 'vnpay' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    apiFetch<SubscriptionsResponse>('/api/subscriptions').then((res) => {
      if (res.ok && res.data) setData(res.data)
      else setError(res.error || 'Không tải được thông tin gói')
      setLoading(false)
    })
  }, [user])

  const isPro = data?.currentTier === 'pro'

  const handleUpgrade = async (method: 'momo' | 'vnpay') => {
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nâng cấp gói</h1>
        <p className="text-gray-600">So sánh gói Free và Pro, thanh toán qua MoMo hoặc VNPay.</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="text-gray-500 text-sm py-4">Đang tải…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-white p-6 shadow space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Free</h2>
              <p className="text-2xl font-bold text-gray-900">0đ</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Đo sóng &amp; lưu lịch sử cơ bản</li>
                <li>Upload cell file, xem báo cáo cơ bản</li>
              </ul>
              {!isPro && (
                <p className="text-xs font-medium text-blue-600 pt-2">Gói hiện tại của bạn</p>
              )}
            </div>

            <div className="rounded-lg bg-white p-6 shadow space-y-3 border-2 border-blue-500">
              <h2 className="text-lg font-semibold text-gray-900">Pro</h2>
              <p className="text-2xl font-bold text-gray-900">
                {data ? data.plan.amountVnd.toLocaleString('vi-VN') : '99.000'}đ
                <span className="text-sm font-normal text-gray-500">
                  {' '}
                  / {data?.plan.billingCycleDays ?? 30} ngày
                </span>
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Toàn bộ tính năng Free</li>
                <li>Báo cáo nâng cao, xuất Excel không giới hạn</li>
                <li>Ưu tiên hỗ trợ</li>
              </ul>
              {isPro ? (
                <p className="text-xs font-medium text-green-600 pt-2">
                  Đang dùng gói Pro
                  {data?.subscription?.billing_cycle_end &&
                    ` (đến ${new Date(data.subscription.billing_cycle_end).toLocaleDateString('vi-VN')})`}
                </p>
              ) : (
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleUpgrade('momo')}
                    disabled={!data?.gateways.momo || starting !== null}
                    className="w-full rounded-lg bg-pink-600 px-4 py-2 font-medium text-white hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {starting === 'momo' ? 'Đang chuyển hướng…' : 'Nâng cấp qua MoMo'}
                  </button>
                  <button
                    onClick={() => handleUpgrade('vnpay')}
                    disabled={!data?.gateways.vnpay || starting !== null}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {starting === 'vnpay' ? 'Đang chuyển hướng…' : 'Nâng cấp qua VNPay'}
                  </button>
                  {data && !data.gateways.momo && !data.gateways.vnpay && (
                    <p className="text-xs text-gray-400 pt-1">
                      Cổng thanh toán đang chờ merchant keys — sắp ra mắt.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {data?.subscription?.payment_status === 'pending' && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              Bạn có một đơn hàng đang chờ xử lý (#{data.subscription.id}). Nếu đã thanh toán mà chưa thấy
              cập nhật, vui lòng tải lại trang sau ít phút.
            </div>
          )}
        </>
      )}
    </div>
  )
}
