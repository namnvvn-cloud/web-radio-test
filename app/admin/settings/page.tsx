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

function AppVersionSettings() {
  const { user, isAdmin } = useAuth()
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [form, setForm] = useState({ minVersionCode: '', latestVersionCode: '', downloadUrl: '', notes: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user || !isAdmin) return
    apiFetch<AppConfig>('/api/admin/app-config').then((res) => {
      if (res.ok && res.data) {
        setConfig(res.data)
        setForm({
          minVersionCode: String(res.data.minVersionCode),
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

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    const res = await apiFetch<AppConfig>('/api/admin/app-config', {
      method: 'PUT',
      body: JSON.stringify({
        minVersionCode: Number(form.minVersionCode),
        latestVersionCode: Number(form.latestVersionCode),
        downloadUrl: form.downloadUrl,
        notes: form.notes,
      }),
    })
    if (res.ok && res.data) {
      setConfig(res.data)
      setMessage({ type: 'success', text: 'Đã lưu cấu hình phiên bản ứng dụng.' })
    } else {
      setMessage({ type: 'error', text: res.error || 'Lưu thất bại' })
    }
    setSaving(false)
  }

  const willForceUpdate =
    config !== null &&
    form.minVersionCode !== '' &&
    Number(form.minVersionCode) > 0 &&
    Number(form.minVersionCode) !== config.minVersionCode

  return (
    <div className="rounded-lg bg-white p-6 shadow space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Quản lý phiên bản ứng dụng Android</h2>
        <p className="text-sm text-gray-500">
          Cấu hình app_config — quyết định user nào bị ép cập nhật (force-update) khi mở app.
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Version Code (bắt buộc cập nhật nếu thấp hơn)
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                value={form.minVersionCode}
                onChange={(e) => setForm({ ...form, minVersionCode: e.target.value })}
              />
              {willForceUpdate && (
                <p className="text-xs text-amber-600 mt-1">
                  Cảnh báo: mọi user có versionCode nhỏ hơn giá trị này sẽ bị chặn, buộc phải cập nhật mới dùng
                  tiếp được app.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Latest Version Code</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                value={form.latestVersionCode}
                onChange={(e) => setForm({ ...form, latestVersionCode: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Download URL</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              value={form.downloadUrl}
              onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })}
              placeholder="https://drive.google.com/..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (hiển thị cho user trong dialog cập nhật)
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {config?.updated_at && (
            <p className="text-xs text-gray-400">Cập nhật lần cuối: {new Date(config.updated_at).toLocaleString()}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Đang lưu…' : 'Lưu cấu hình phiên bản'}
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
