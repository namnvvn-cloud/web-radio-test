'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'
import type { MeasurementSession, MeasurementRow } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Đang đo',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã huỷ',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('vi-VN')
}

function cell(value: number | string | null) {
  return value === null || value === undefined ? '—' : String(value)
}

export default function SessionDetailPage() {
  const { user } = useAuth()
  const params = useParams<{ id: string }>()
  const sessionId = params.id

  const [session, setSession] = useState<MeasurementSession | null>(null)
  const [rows, setRows] = useState<MeasurementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await apiFetch<{ session: MeasurementSession; measurements: MeasurementRow[] }>(
      `/api/measurements/session/${sessionId}`
    )
    if (res.ok && res.data) {
      setSession(res.data.session)
      setRows(res.data.measurements)
    } else {
      setError(res.error || 'Không tải được phiên đo')
    }
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, not derived state
    if (user && sessionId) load()
  }, [user, sessionId, load])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/user/sessions" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          ← Phiên đo
        </Link>
      </div>

      {error && <div className="rounded-md p-4 text-sm bg-red-50 text-red-700">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Đang tải…</div>
      ) : session ? (
        <>
          <div className="rounded-lg bg-white shadow p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Chế độ</p>
              <p className="font-medium">{session.mode || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Trạng thái</p>
              <p className="font-medium">{STATUS_LABEL[session.status || ''] || session.status || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Bắt đầu</p>
              <p className="font-medium">{formatDate(session.started_at)}</p>
            </div>
            <div>
              <p className="text-gray-500">Kết thúc</p>
              <p className="font-medium">{formatDate(session.ended_at)}</p>
            </div>
            <div>
              <p className="text-gray-500">Số điểm đo</p>
              <p className="font-medium">{rows.length}</p>
            </div>
          </div>

          <div className="rounded-lg bg-white shadow overflow-x-auto">
            {rows.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Phiên đo này chưa có dữ liệu đo</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-3 py-2 font-semibold text-gray-900">Thời gian</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-900">RAT</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-900">Band</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-900">Cell ID</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-900">PCI</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-900">RSRP</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-900">RSRQ</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-900">SINR</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-900">TA</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-900">Toạ độ</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-900">Mạng</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-1.5 whitespace-nowrap">{formatDate(m.timestamp)}</td>
                      <td className="px-3 py-1.5">{cell(m.rat)}</td>
                      <td className="px-3 py-1.5">{cell(m.band)}</td>
                      <td className="px-3 py-1.5">{cell(m.cell_id)}</td>
                      <td className="px-3 py-1.5">{cell(m.pci)}</td>
                      <td className="px-3 py-1.5">{cell(m.rsrp)}</td>
                      <td className="px-3 py-1.5">{cell(m.rsrq)}</td>
                      <td className="px-3 py-1.5">{cell(m.sinr)}</td>
                      <td className="px-3 py-1.5">{cell(m.ta)}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {m.latitude !== null && m.longitude !== null ? `${m.latitude}, ${m.longitude}` : '—'}
                      </td>
                      <td className="px-3 py-1.5">{cell(m.mcc_mnc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        !error && <div className="text-center py-12 text-gray-500">Không tìm thấy phiên đo</div>
      )}
    </div>
  )
}
