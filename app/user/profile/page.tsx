'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'
import { usePasswordReset } from '@/lib/auth-hooks'
import { updatePassword } from '@/lib/auth'
import type { UserProfile } from '@/lib/types'

const VALID_OPERATORS = [
  'MobiFone', 'Viettel', 'VNPT', 'Vietnamobile',
  'Gmobile', 'Reddi', 'Elise', 'Itelecom', 'Wintel',
]

export default function ProfilePage() {
  const { user } = useAuth()
  const { resetPassword, loading: resetLoading } = usePasswordReset()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [operator, setOperator] = useState('MobiFone')

  // Đổi mật khẩu trực tiếp -- trước đây trang này chỉ có nút gửi email reset
  // link, phải rời khỏi app + mở email + bấm link mới đổi được. Với tài
  // khoản admin bootstrap bằng mật khẩu tạm, cần đổi ngay tại chỗ không qua
  // email. lib/auth.ts đã có sẵn updatePassword() (gọi supabase.auth.updateUser)
  // nhưng chưa từng được UI nào dùng tới (04/09/2026).
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    if (!user) return
    apiFetch<{ profile: UserProfile }>('/api/profile').then((res) => {
      if (res.ok && res.data) {
        setProfile(res.data.profile)
        setFullName(res.data.profile.full_name || '')
        setPhone(res.data.profile.phone_number || '')
        setOperator(res.data.profile.nha_mang_mac_dinh)
      }
      setLoading(false)
    })
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    const res = await apiFetch<{ profile: UserProfile }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        full_name: fullName,
        phone_number: phone,
        nha_mang_mac_dinh: operator,
      }),
    })
    if (res.ok && res.data) {
      setProfile(res.data.profile)
      setMessage({ type: 'success', text: 'Profile updated' })
    } else {
      setMessage({ type: 'error', text: res.error || 'Update failed' })
    }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' })
      return
    }
    setChangingPassword(true)
    setMessage(null)
    const result = await updatePassword(newPassword)
    if (result.success) {
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công' })
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setMessage({ type: 'error', text: result.error || 'Đổi mật khẩu thất bại' })
    }
    setChangingPassword(false)
  }

  const handlePasswordReset = async () => {
    if (!profile?.email) return
    const result = await resetPassword(profile.email)
    setMessage(
      result.success
        ? { type: 'success', text: 'Password reset link sent to your email' }
        : { type: 'error', text: result.error || 'Failed to send reset link' }
    )
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading…</div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">Manage your account information</p>
      </div>

      {message && (
        <div className={`rounded-md p-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 bg-gray-100"
            value={profile?.email || ''}
            disabled
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="+84 123 456 789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Operator</label>
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {VALID_OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="rounded-lg bg-white p-6 shadow space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Đổi mật khẩu</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu mới</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Ít nhất 6 ký tự"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Xác nhận mật khẩu mới</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
          />
        </div>
        <button
          onClick={handleChangePassword}
          disabled={changingPassword || !newPassword || !confirmPassword}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {changingPassword ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu'}
        </button>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            Hoặc gửi link đặt lại mật khẩu qua email tới {profile?.email}.
          </p>
          <button
            onClick={handlePasswordReset}
            disabled={resetLoading}
            className="w-full rounded-lg bg-gray-700 px-4 py-2 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {resetLoading ? 'Sending…' : 'Send Password Reset Email'}
          </button>
        </div>
      </div>
    </div>
  )
}
