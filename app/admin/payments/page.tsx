'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'
import { VN_BANKS } from '@/lib/payment/banks'
import type { PaymentRequest } from '@/lib/types'

type PaymentSettingsRow = {
  payment_enabled: boolean
  monthly_price_vnd: number
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  bank_branch: string | null
  momo_phone: string | null
  vnpay_note: string | null
  usd_markup_percent: number
  updated_at: string | null
}

type FxInfo = { rate: number; source: string; fetchedAt: string | null }

const PRICE_PRESETS = [20000, 50000, 80000, 100000, 200000]

export default function AdminPaymentsPage() {
  const { user, isAdmin } = useAuth()
  const [settings, setSettings] = useState<PaymentSettingsRow | null>(null)
  const [form, setForm] = useState({
    paymentEnabled: false,
    monthlyPriceVnd: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    bankBranch: '',
    momoPhone: '',
    vnpayNote: '',
    usdMarkupPercent: '0',
  })
  const [fx, setFx] = useState<FxInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [requests, setRequests] = useState<PaymentRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [reviewing, setReviewing] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    const res = await apiFetch<{ settings: PaymentSettingsRow; fx: FxInfo }>('/api/admin/payment-settings')
    if (res.ok && res.data) {
      setSettings(res.data.settings)
      setFx(res.data.fx)
      setForm({
        paymentEnabled: res.data.settings.payment_enabled,
        monthlyPriceVnd: String(res.data.settings.monthly_price_vnd),
        bankName: res.data.settings.bank_name || '',
        bankAccountNumber: res.data.settings.bank_account_number || '',
        bankAccountName: res.data.settings.bank_account_name || '',
        bankBranch: res.data.settings.bank_branch || '',
        momoPhone: res.data.settings.momo_phone || '',
        vnpayNote: res.data.settings.vnpay_note || '',
        usdMarkupPercent: String(res.data.settings.usd_markup_percent ?? 0),
      })
    } else {
      setMessage({ type: 'error', text: res.error || 'Không tải được cấu hình thanh toán' })
    }
    setLoading(false)
  }, [])

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true)
    const res = await apiFetch<{ requests: PaymentRequest[] }>('/api/admin/payments/requests?status=pending')
    if (res.ok && res.data) setRequests(res.data.requests)
    setRequestsLoading(false)
  }, [])

  useEffect(() => {
    if (!user || !isAdmin) return
    loadSettings()
    loadRequests()
  }, [user, isAdmin, loadSettings, loadRequests])

  const priceNumber = Number(form.monthlyPriceVnd) || 0
  const usdPreview =
    fx && priceNumber > 0
      ? (priceNumber / fx.rate) * (1 + (Number(form.usdMarkupPercent) || 0) / 100)
      : null

  const handleSave = async () => {
    setMessage(null)
    if (!Number.isInteger(priceNumber) || priceNumber < 0) {
      setMessage({ type: 'error', text: 'Giá gói/tháng phải là số nguyên >= 0' })
      return
    }
    if (form.paymentEnabled && (!form.bankName || !form.bankAccountNumber || !form.bankAccountName)) {
      setMessage({ type: 'error', text: 'Cần nhập đủ Ngân hàng, Số tài khoản, Tên chủ tài khoản trước khi kích hoạt' })
      return
    }
    if (form.paymentEnabled && !settings?.payment_enabled) {
      const ok = confirm(
        'Kích hoạt thu phí: mọi user MỚI đăng ký từ giờ trở đi sẽ cần thanh toán để dùng gói Pro. ' +
          'User đang dùng Free/Pro hiện tại không bị ảnh hưởng ngay lập tức. Xác nhận?'
      )
      if (!ok) return
    }

    setSaving(true)
    const res = await apiFetch<{ settings: PaymentSettingsRow }>('/api/admin/payment-settings', {
      method: 'PUT',
      body: JSON.stringify({
        paymentEnabled: form.paymentEnabled,
        monthlyPriceVnd: priceNumber,
        bankName: form.bankName,
        bankAccountNumber: form.bankAccountNumber,
        bankAccountName: form.bankAccountName,
        bankBranch: form.bankBranch,
        momoPhone: form.momoPhone,
        vnpayNote: form.vnpayNote,
        usdMarkupPercent: Number(form.usdMarkupPercent) || 0,
      }),
    })
    if (res.ok && res.data) {
      setSettings(res.data.settings)
      setMessage({ type: 'success', text: 'Đã lưu cấu hình thanh toán.' })
    } else {
      setMessage({ type: 'error', text: res.error || 'Lưu thất bại' })
    }
    setSaving(false)
  }

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? 'DUYỆT (nâng user lên Pro ngay)' : 'TỪ CHỐI'
    if (!confirm(`Xác nhận ${label} yêu cầu thanh toán này?`)) return

    setReviewing(id)
    const res = await apiFetch(`/api/admin/payments/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id))
    } else {
      setMessage({ type: 'error', text: res.error || 'Xử lý thất bại' })
    }
    setReviewing(null)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Thanh toán</h1>
        <p className="text-gray-600">Cấu hình thu phí gói Pro và duyệt các yêu cầu thanh toán thủ công.</p>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow space-y-6">
        {loading ? (
          <p className="text-gray-500 text-sm py-4">Đang tải…</p>
        ) : (
          <>
            {/* (1) Bật/tắt thu phí */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Kích hoạt thu phí</h2>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="w-5 h-5"
                  checked={form.paymentEnabled}
                  onChange={(e) => setForm({ ...form, paymentEnabled: e.target.checked })}
                />
                <span className="text-sm text-gray-700">
                  {form.paymentEnabled
                    ? 'Đang BẬT — user mới cần thanh toán để dùng gói Pro'
                    : 'Đang TẮT — toàn bộ tính năng đang miễn phí cho mọi user'}
                </span>
              </label>
            </div>

            <hr />

            {/* (2) Giá */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Giá gói Pro / tháng</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRICE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, monthlyPriceVnd: String(p) })}
                    className={`rounded-full px-4 py-1.5 text-sm border ${
                      priceNumber === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {(p / 1000).toLocaleString('vi-VN')}k
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  value={form.monthlyPriceVnd}
                  onChange={(e) => setForm({ ...form, monthlyPriceVnd: e.target.value })}
                  placeholder="Nhập giá tùy ý (VNĐ)"
                />
                <span className="text-gray-500 whitespace-nowrap">đ / tháng</span>
              </div>
              {usdPreview !== null && fx && (
                <p className="text-xs text-gray-500 mt-2">
                  ≈ {usdPreview.toFixed(2)} USD (tỷ giá live {fx.rate.toLocaleString('vi-VN')}đ/USD
                  {fx.source !== 'live' ? `, nguồn: ${fx.source}` : ''}) — dùng cho tùy chọn thanh toán Visa.
                </p>
              )}
            </div>

            <hr />

            {/* (3) Tài khoản nhận thanh toán */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Tài khoản nhận thanh toán (chuyển khoản ngân hàng)</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngân hàng</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 bg-white"
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  >
                    <option value="">-- Chọn ngân hàng --</option>
                    {VN_BANKS.map((b) => (
                      <option key={b.code} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                    <option value={form.bankName && !VN_BANKS.some((b) => b.name === form.bankName) ? form.bankName : ''}>
                      Khác...
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Số tài khoản</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                    value={form.bankAccountNumber}
                    onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên chủ tài khoản</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 uppercase"
                    value={form.bankAccountName}
                    onChange={(e) => setForm({ ...form, bankAccountName: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chi nhánh (tùy chọn)</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                    value={form.bankBranch}
                    onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                  />
                </div>
              </div>

              <p className="text-sm font-medium text-gray-700 mt-4 mb-2">
                Thông tin cho MoMo / VNPay (lưu trước, kích hoạt thật khi có merchant key)
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại MoMo nhận tiền</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                    value={form.momoPhone}
                    onChange={(e) => setForm({ ...form, momoPhone: e.target.value })}
                    placeholder="09xxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú VNPay (merchant, mã số thuế...)</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                    value={form.vnpayNote}
                    onChange={(e) => setForm({ ...form, vnpayNote: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-4 max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phụ phí Visa/USD (%, bù phí quốc tế)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  value={form.usdMarkupPercent}
                  onChange={(e) => setForm({ ...form, usdMarkupPercent: e.target.value })}
                />
              </div>
            </div>

            {settings?.updated_at && (
              <p className="text-xs text-gray-400">
                Cập nhật lần cuối: {new Date(settings.updated_at).toLocaleString('vi-VN')}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Đang lưu…' : 'Lưu cấu hình thanh toán'}
            </button>
          </>
        )}
      </div>

      <div className="rounded-lg bg-white p-6 shadow space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Yêu cầu thanh toán đang chờ duyệt</h2>
        {requestsLoading ? (
          <p className="text-gray-500 text-sm py-2">Đang tải…</p>
        ) : requests.length === 0 ? (
          <p className="text-gray-500 text-sm py-2">Không có yêu cầu nào đang chờ.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Người dùng</th>
                  <th className="py-2 pr-4">Phương thức</th>
                  <th className="py-2 pr-4">Số tiền</th>
                  <th className="py-2 pr-4">Mã đơn</th>
                  <th className="py-2 pr-4">Thời gian</th>
                  <th className="py-2 pr-4">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{r.user_full_name || '—'}</div>
                      <div className="text-gray-500">{r.user_email}</div>
                    </td>
                    <td className="py-2 pr-4">
                      {{ bank_transfer: 'Chuyển khoản', momo: 'MoMo', vnpay: 'VNPay', atm_card: `Thẻ nội địa (${r.bank_selected || '—'})`, visa: 'Visa' }[r.method]}
                    </td>
                    <td className="py-2 pr-4">
                      {r.amount_vnd.toLocaleString('vi-VN')}đ
                      {r.amount_usd ? ` (${r.amount_usd} USD)` : ''}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">{r.order_code}</td>
                    <td className="py-2 pr-4 text-gray-500">{new Date(r.created_at).toLocaleString('vi-VN')}</td>
                    <td className="py-2 pr-4 space-x-2">
                      <button
                        onClick={() => handleReview(r.id, 'approve')}
                        disabled={reviewing === r.id}
                        className="rounded-md bg-green-600 px-3 py-1 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => handleReview(r.id, 'reject')}
                        disabled={reviewing === r.id}
                        className="rounded-md bg-red-600 px-3 py-1 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        Từ chối
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
