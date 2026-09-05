'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'

type AppConfig = {
  minVersionCode: number
  latestVersionCode: number
  downloadUrl: string
  notes: string
  updated_at: string | null
}

/**
 * Phát hành bản mới cho app Android RadioTest.
 *
 * Chỉ cần nhập version code mới + link tải APK + ghi chú, bấm "Phát hành".
 * minVersionCode KHÔNG còn là một ô nhập riêng: nó luôn được gửi lên bằng
 * đúng giá trị latestVersionCode, và một trigger CSDL (trg_sync_min_version_code
 * trên bảng public.app_config) tự đồng bộ lại y hệt mỗi khi latestVersionCode
 * đổi -- kể cả khi có ai đó sửa thẳng trong Supabase SQL Editor. Nhờ vậy,
 * mọi máy đang chạy bản cũ hơn version vừa nhập sẽ bị khoá cứng ngay lập
 * tức, bắt phải tải bản mới mới dùng tiếp được -- không cần đụng gì khác
 * cho mỗi lần ra bản mới sau này (V38, V39, ...).
 */
function AppVersionSettings() {
  const { user, isAdmin } = useAuth()
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [form, setForm] = useState({ latestVersionCode: '', downloadUrl: '', notes: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user || !isAdmin) return
    apiFetch<AppConfig>('/api/admin/app-config').then((res) => {
      if (res.ok && res.data) {
        setConfig(res.data)
        setForm({
          latestVersionCode: String(res.data.latestVersionCode),
          downloadUrl: res.data.downloadUrl,
          notes: res.data.notes,
        })
      } else {
        setMessage({ type: 'error', text: res.error || 'Không tải được cấu hình' })
      }
      setLoading(false)
    })
  }, [user, isAdmin])

  const newCode = Number(form.latestVersionCode)
  const isValidCode = form.latestVersionCode !== '' && Number.isInteger(newCode) && newCode > 0
  const isNewer = config === null || (isValidCode && newCode > config.latestVersionCode)

  const handleSave = async () => {
    if (!isValidCode) {
      setMessage({ type: 'error', text: 'Version code phải là số nguyên dương' })
      return
    }
    if (!form.downloadUrl.trim()) {
      setMessage({ type: 'error', text: 'Cần nhập link tải APK' })
      return
    }
    if (config && newCode <= config.latestVersionCode) {
      const proceed = confirm(
        `Version ${newCode} không lớn hơn bản hiện tại (${config.latestVersionCode}). ` +
          `Vẫn tiếp tục?`
      )
      if (!proceed) return
    }

    const confirmed = confirm(
      `Xác nhận phát hành Version ${newCode}?\n\n` +
        `Mọi máy đang chạy bản cũ hơn V${newCode} sẽ BỊ KHOÁ ngay lập tức và phải ` +
        `tải bản mới mới dùng tiếp được app. Hành động có hiệu lực tức thì, không thể hoàn tác.`
    )
    if (!confirmed) return

    setSaving(true)
    setMessage(null)
    const res = await apiFetch<AppConfig>('/api/admin/app-config', {
      method: 'PUT',
      body: JSON.stringify({
        // minVersionCode luôn khoá theo latestVersionCode -- trigger CSDL
        // cũng tự làm việc này, đây chỉ là gửi kèm cho nhất quán ngay lần lưu đầu.
        minVersionCode: newCode,
        latestVersionCode: newCode,
        downloadUrl: form.downloadUrl.trim(),
        notes: form.notes.trim(),
      }),
    })
    if (res.ok && res.data) {
      setConfig(res.data)
      setMessage({
        type: 'success',
        text: `Đã phát hành V${res.data.latestVersionCode}. Toàn bộ máy chưa cập nhật sẽ bị khoá.`,
      })
    } else {
      setMessage({ type: 'error', text: res.error || 'Lưu thất bại' })
    }
    setSaving(false)
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Phát hành bản mới — App Android RadioTest</h2>
        <p className="text-sm text-gray-500">
          Nhập version mới + link APK → toàn bộ máy chưa cập nhật bị khoá tự động. Không cần sửa code hay vào
          Supabase cho các lần sau.
        </p>
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

      {loading ? (
        <p className="text-gray-500 text-sm py-4">Đang tải…</p>
      ) : (
        <div className="space-y-4">
          {config && (
            <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700 grid grid-cols-2 gap-y-1">
              <span className="text-gray-500">Version đang áp dụng</span>
              <span className="font-medium">V{config.latestVersionCode}</span>
              <span className="text-gray-500">Version tối thiểu (đang khoá)</span>
              <span className="font-medium">V{config.minVersionCode}</span>
              {config.updated_at && (
                <>
                  <span className="text-gray-500">Cập nhật lần cuối</span>
                  <span className="font-medium">{new Date(config.updated_at).toLocaleString('vi-VN')}</span>
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Version code mới {config ? `(> ${config.latestVersionCode})` : ''}
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              value={form.latestVersionCode}
              onChange={(e) => setForm({ ...form, latestVersionCode: e.target.value })}
              placeholder="Ví dụ: 38"
            />
            {isValidCode && !isNewer && (
              <p className="text-xs text-amber-600 mt-1">
                Cảnh báo: không lớn hơn version hiện tại ({config?.latestVersionCode}).
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Link tải APK (Google Drive)</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              value={form.downloadUrl}
              onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })}
              placeholder="https://drive.google.com/uc?id=...&export=download"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ghi chú bản build (hiển thị cho user trong dialog cập nhật)
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Mô tả ngắn nội dung cập nhật..."
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Đang phát hành…' : 'Phát hành & Ép buộc nâng cấp'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-600">Configure platform-wide settings</p>
      </div>

      <AppVersionSettings />

      <div className="rounded-lg bg-white p-6 shadow space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform Name
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                value="Web Radio Test"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Geohash Precision
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                defaultValue={7}
              />
              <p className="text-xs text-gray-500 mt-1">For benchmark aggregates</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enable User Registrations
              </label>
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" defaultChecked />
                <span className="text-sm text-gray-600">Allow new users to sign up</span>
              </div>
            </div>
          </div>
        </div>

        <hr />

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cellfile Deduplication</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance Threshold (meters)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                defaultValue={30}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Azimuth Threshold (degrees)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                defaultValue={10}
              />
            </div>
          </div>
        </div>

        <button className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
          Save Settings
        </button>
      </div>
    </div>
  )
}
