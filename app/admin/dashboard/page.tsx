'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'
import DailySeriesChart, { type DailyPoint } from '@/components/DailySeriesChart'

type AdminStats = {
  total_users: number
  total_cellfiles: number
  total_logfiles: number
  total_measurements: number
  total_reports: number
  app_usage_last_30_days: {
    unique_devices: number
    app_opens: number
    login_successes: number
    heartbeats: number
  }
  recent_audit_log: Array<{
    id: number
    action: string
    target_table: string | null
    created_at: string
    details: Record<string, unknown> | null
  }>
  daily_series: DailyPoint[]
}

export default function AdminDashboardPage() {
  const { user, isAdmin } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !isAdmin) return
    apiFetch<{ stats: AdminStats }>('/api/admin/stats').then((res) => {
      if (res.ok && res.data) {
        setStats(res.data.stats)
      } else {
        setError(res.error)
      }
      setLoading(false)
    })
  }, [user, isAdmin])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Overview and management of platform data</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-2xl font-bold text-gray-900">{loading ? '…' : stats?.total_users ?? 0}</div>
          <p className="text-sm text-gray-600">Total Users</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-2xl font-bold text-gray-900">{loading ? '…' : stats?.total_measurements ?? 0}</div>
          <p className="text-sm text-gray-600">Total Measurements</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-2xl font-bold text-gray-900">{loading ? '…' : stats?.total_cellfiles ?? 0}</div>
          <p className="text-sm text-gray-600">Cell Records</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-2xl font-bold text-gray-900">{loading ? '…' : stats?.total_reports ?? 0}</div>
          <p className="text-sm text-gray-600">Reports Generated</p>
        </div>
      </div>

      {/* Phase 0.5 usage stats */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">App Usage (Last 30 Days)</h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <div className="text-xl font-bold text-gray-900">
              {loading ? '…' : stats?.app_usage_last_30_days.unique_devices ?? 0}
            </div>
            <p className="text-sm text-gray-600">Unique Devices</p>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">
              {loading ? '…' : stats?.app_usage_last_30_days.app_opens ?? 0}
            </div>
            <p className="text-sm text-gray-600">App Opens</p>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">
              {loading ? '…' : stats?.app_usage_last_30_days.login_successes ?? 0}
            </div>
            <p className="text-sm text-gray-600">Successful Logins</p>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">
              {loading ? '…' : stats?.app_usage_last_30_days.heartbeats ?? 0}
            </div>
            <p className="text-sm text-gray-600">Heartbeats</p>
          </div>
        </div>
      </div>

      {/* Phase 2 — registrations/usage trend chart */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Đăng ký &amp; sử dụng theo ngày (30 ngày gần nhất)</h2>
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading…</p>
        ) : !stats?.daily_series || stats.daily_series.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Chưa có dữ liệu</p>
        ) : (
          <DailySeriesChart data={stats.daily_series} />
        )}
      </div>

      {/* Recent Admin Actions */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Audit Log</h2>
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading…</p>
        ) : !stats?.recent_audit_log || stats.recent_audit_log.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.recent_audit_log.map((entry) => (
              <div key={entry.id} className="py-2 flex justify-between text-sm">
                <span className="text-gray-900">
                  <span className="font-medium">{entry.action}</span>
                  {entry.target_table ? ` on ${entry.target_table}` : ''}
                </span>
                <span className="text-gray-500">{new Date(entry.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
