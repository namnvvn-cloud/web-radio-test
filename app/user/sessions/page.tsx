'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'
import type { MeasurementSession } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Đang đo',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã huỷ',
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('vi-VN')
}

export default function SessionsPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<MeasurementSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await apiFetch<{ sessions: MeasurementSession[] }>('/api/measurements/session/list')
    if (res.ok && res.data) {
      setSessions(res.data.sessions)
    } else {
      setError(res.error || 'Không tải được danh sách phiên đo')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, not derived state
    if (user) loadSessions()
  }, [user, loadSessions])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Phiên đo</h1>
        <p className="text-gray-600">Dữ liệu đo sóng tải lên từ app RadioTest (Android)</p>
      </div>

      {error && (
        <div className="rounded-md p-4 text-sm bg-red-50 text-red-700">{error}</div>
      )}

      <div className="rounded-lg bg-white shadow overflow-x-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Đang tải…</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Chưa có phiên đo nào</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Chế độ</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Trạng thái</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Bắt đầu</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Kết thúc</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Số điểm đo</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{s.mode || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status || ''] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[s.status || ''] || s.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2">{formatDate(s.started_at)}</td>
                  <td className="px-4 py-2">{formatDate(s.ended_at)}</td>
                  <td className="px-4 py-2">{s.measurement_count ?? 0}</td>
                  <td className="px-4 py-2">
                    <Link href={`/user/sessions/${s.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      Xem chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
