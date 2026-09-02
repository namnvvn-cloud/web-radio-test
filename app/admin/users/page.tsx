'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'
import type { UserProfile } from '@/lib/types'

export default function UsersPage() {
  const { user, isAdmin } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadUsers = useCallback(async (q?: string) => {
    setLoading(true)
    const qs = q ? `&search=${encodeURIComponent(q)}` : ''
    const res = await apiFetch<{ users: UserProfile[] }>(`/api/admin/users?limit=100${qs}`)
    if (res.ok && res.data) setUsers(res.data.users)
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, not derived state
    if (user && isAdmin) loadUsers()
  }, [user, isAdmin, loadUsers])

  const handleRoleToggle = async (target: UserProfile) => {
    const newRole = target.role === 'admin' ? 'user' : 'admin'
    if (!confirm(`Change ${target.email} to role "${newRole}"?`)) return

    const res = await apiFetch<{ profile: UserProfile }>(`/api/admin/users/${target.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole }),
    })

    if (res.ok && res.data) {
      setUsers((prev) => prev.map((u) => (u.id === target.id ? res.data!.profile : u)))
      setMessage({ type: 'success', text: `${target.email} is now ${newRole}` })
    } else {
      setMessage({ type: 'error', text: res.error || 'Update failed' })
    }
  }

  const handleTierToggle = async (target: UserProfile) => {
    const newTier = target.subscription_tier === 'pro' ? 'free' : 'pro'
    const res = await apiFetch<{ profile: UserProfile }>(`/api/admin/users/${target.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ subscription_tier: newTier }),
    })

    if (res.ok && res.data) {
      setUsers((prev) => prev.map((u) => (u.id === target.id ? res.data!.profile : u)))
      setMessage({ type: 'success', text: `${target.email} is now ${newTier}` })
    } else {
      setMessage({ type: 'error', text: res.error || 'Update failed' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage platform users and their access levels</p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); loadUsers(search) }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email or name…"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-red-700 px-4 py-2 text-white text-sm font-medium hover:bg-red-800">
            Search
          </button>
        </form>
      </div>

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
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Joined</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>
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
                  <td className="px-4 py-2 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 space-x-3">
                    <button onClick={() => handleRoleToggle(u)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      {u.role === 'admin' ? 'Revoke admin' : 'Make admin'}
                    </button>
                    <button onClick={() => handleTierToggle(u)} className="text-purple-600 hover:text-purple-800 text-xs font-medium">
                      {u.subscription_tier === 'pro' ? 'Set free' : 'Set pro'}
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
