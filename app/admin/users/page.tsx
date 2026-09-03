'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'

type UserRow = UserProfile & {
  cellfiles_count: number
  logfiles_count: number
  reports_count: number
}

type Filters = { search: string; tier: string; status: string; from: string; to: string }

const EMPTY_FILTERS: Filters = { search: '', tier: '', status: '', from: '', to: '' }

function buildQuery(f: Filters): string {
  const parts: string[] = []
  if (f.search) parts.push(`search=${encodeURIComponent(f.search)}`)
  if (f.tier) parts.push(`tier=${encodeURIComponent(f.tier)}`)
  if (f.status) parts.push(`status=${encodeURIComponent(f.status)}`)
  if (f.from) parts.push(`from=${encodeURIComponent(f.from)}`)
  if (f.to) parts.push(`to=${encodeURIComponent(f.to)}`)
  return parts.length ? `&${parts.join('&')}` : ''
}

export default function UsersPage() {
  const { user, isAdmin } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadUsers = useCallback(async (f: Filters) => {
    setLoading(true)
    const res = await apiFetch<{ users: UserRow[] }>(`/api/admin/users?limit=100${buildQuery(f)}`)
    if (res.ok && res.data) setUsers(res.data.users)
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, not derived state
    if (user && isAdmin) loadUsers(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on mount/auth change; filter changes go through the form submit below
  }, [user, isAdmin, loadUsers])

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const res = await fetch(`/api/admin/users/export?${buildQuery(filters).replace(/^&/, '')}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setMessage({ type: 'error', text: body?.error || 'Export failed' })
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Export failed' })
    } finally {
      setExporting(false)
    }
  }

  const handleRoleToggle = async (target: UserRow) => {
    const newRole = target.role === 'admin' ? 'user' : 'admin'
    if (!confirm(`Change ${target.email} to role "${newRole}"?`)) return

    const res = await apiFetch<{ profile: UserProfile }>(`/api/admin/users/${target.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole }),
    })

    if (res.ok && res.data) {
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, ...res.data!.profile } : u)))
      setMessage({ type: 'success', text: `${target.email} is now ${newRole}` })
    } else {
      setMessage({ type: 'error', text: res.error || 'Update failed' })
    }
  }

  const handleTierToggle = async (target: UserRow) => {
    const newTier = target.subscription_tier === 'pro' ? 'free' : 'pro'
    const res = await apiFetch<{ profile: UserProfile }>(`/api/admin/users/${target.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ subscription_tier: newTier }),
    })

    if (res.ok && res.data) {
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, ...res.data!.profile } : u)))
      setMessage({ type: 'success', text: `${target.email} is now ${newTier}` })
    } else {
      setMessage({ type: 'error', text: res.error || 'Update failed' })
    }
  }

  const handleLockToggle = async (target: UserRow) => {
    const nextLocked = !target.is_locked
    if (nextLocked && !confirm(`Lock ${target.email}? They will not be able to sign in.`)) return

    const res = await apiFetch<{ profile: UserProfile }>(`/api/admin/users/${target.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_locked: nextLocked }),
    })

    if (res.ok && res.data) {
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, ...res.data!.profile } : u)))
      setMessage({ type: 'success', text: `${target.email} is now ${nextLocked ? 'locked' : 'unlocked'}` })
    } else {
      setMessage({ type: 'error', text: res.error || 'Update failed' })
    }
  }

  const handleResetPassword = async (target: UserRow) => {
    if (!confirm(`Send a password reset email to ${target.email}?`)) return

    const res = await apiFetch<{ message: string }>(`/api/admin/users/${target.id}/reset-password`, {
      method: 'POST',
    })

    setMessage(
      res.ok
        ? { type: 'success', text: res.data?.message || 'Reset email sent' }
        : { type: 'error', text: res.error || 'Failed to send reset email' }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage platform users and their access levels</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-lg bg-green-700 px-4 py-2 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-50"
        >
          {exporting ? 'Đang xuất…' : 'Export Excel'}
        </button>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); loadUsers(filters) }}
        className="rounded-lg bg-white p-4 shadow flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Email hoặc tên…"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Gói</label>
          <select
            value={filters.tier}
            onChange={(e) => setFilters((f) => ({ ...f, tier: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Trạng thái</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            <option value="active">Active</option>
            <option value="locked">Locked</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Đăng ký từ</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Đến</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="rounded-lg bg-red-700 px-4 py-2 text-white text-sm font-medium hover:bg-red-800">
          Lọc
        </button>
        {(filters.search || filters.tier || filters.status || filters.from || filters.to) && (
          <button
            type="button"
            onClick={() => { setFilters(EMPTY_FILTERS); loadUsers(EMPTY_FILTERS) }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Xoá lọc
          </button>
        )}
      </form>

      {message && (
        <div className={`rounded-md p-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Email</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Name</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Operator</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Tier</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Role</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Status</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Files</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Joined</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.full_name || '-'}</td>
                  <td className="px-4 py-2">{u.nha_mang_mac_dinh}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.subscription_tier === 'pro' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.subscription_tier}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.is_locked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {u.is_locked ? 'Locked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {u.cellfiles_count} cell · {u.logfiles_count} log · {u.reports_count} report
                  </td>
                  <td className="px-4 py-2 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 space-x-3 whitespace-nowrap">
                    <button onClick={() => handleRoleToggle(u)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      {u.role === 'admin' ? 'Revoke admin' : 'Make admin'}
                    </button>
                    <button onClick={() => handleTierToggle(u)} className="text-purple-600 hover:text-purple-800 text-xs font-medium">
                      {u.subscription_tier === 'pro' ? 'Set free' : 'Set pro'}
                    </button>
                    <button onClick={() => handleLockToggle(u)} className="text-orange-600 hover:text-orange-800 text-xs font-medium">
                      {u.is_locked ? 'Unlock' : 'Lock'}
                    </button>
                    <button onClick={() => handleResetPassword(u)} className="text-gray-600 hover:text-gray-800 text-xs font-medium">
                      Reset password
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
