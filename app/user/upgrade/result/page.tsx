'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'

/**
 * Landing page after redirecting back from MoMo/VNPay (vnp_ReturnUrl /
 * MoMo redirectUrl). The gateway's query params on this URL are NOT
 * trusted for granting Pro — only the server-side IPN does that. This
 * page just re-fetches the subscription status and tells the user what
 * happened; if the IPN hasn't landed yet it says so instead of guessing.
 */
export default function UpgradeResultPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<'loading' | 'pro' | 'pending' | 'failed' | 'unknown'>('loading')

  useEffect(() => {
    if (!user) return
    apiFetch<{ currentTier: 'free' | 'pro'; subscription: { payment_status: string } | null }>(
      '/api/subscriptions'
    ).then((res) => {
      if (!res.ok || !res.data) return setStatus('unknown')
      if (res.data.currentTier === 'pro') return setStatus('pro')
      if (res.data.subscription?.payment_status === 'failed') return setStatus('failed')
      setStatus('pending')
    })
  }, [user])

  return (
    <div className="max-w-md mx-auto text-center space-y-4 py-12">
      {status === 'loading' && <p className="text-gray-500">Đang kiểm tra kết quả thanh toán…</p>}
      {status === 'pro' && (
        <>
          <p className="text-2xl">🎉</p>
          <h1 className="text-xl font-semibold text-gray-900">Nâng cấp thành công</h1>
          <p className="text-gray-600">Tài khoản của bạn đã được nâng lên gói Pro.</p>
        </>
      )}
      {status === 'pending' && (
        <>
          <h1 className="text-xl font-semibold text-gray-900">Đang xử lý thanh toán</h1>
          <p className="text-gray-600">
            Nếu bạn vừa hoàn tất thanh toán, hệ thống có thể cần vài phút để xác nhận. Vui lòng tải lại
            trang này sau, hoặc kiểm tra lại ở trang Nâng cấp gói.
          </p>
        </>
      )}
      {status === 'failed' && (
        <>
          <h1 className="text-xl font-semibold text-gray-900">Thanh toán không thành công</h1>
          <p className="text-gray-600">Giao dịch đã bị huỷ hoặc thất bại. Bạn có thể thử lại.</p>
        </>
      )}
      {status === 'unknown' && (
        <p className="text-gray-600">Không kiểm tra được trạng thái. Vui lòng thử lại ở trang Nâng cấp gói.</p>
      )}
      <Link href="/user/upgrade" className="inline-block text-blue-600 hover:underline text-sm">
        ← Quay lại trang Nâng cấp gói
      </Link>
    </div>
  )
}
