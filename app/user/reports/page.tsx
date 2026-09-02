'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'
import type { Logfile, Report } from '@/lib/types'

type ReportRow = Report & { download_url: string | null }

export default function ReportsPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Logfile[]>([])
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [reportType, setReportType] = useState<'kml' | 'excel' | 'csv'>('excel')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [sessionsRes, reportsRes] = await Promise.all([
      apiFetch<{ logfiles: Logfile[] }>('/api/logfiles?limit=100'),
      apiFetch<{ reports: ReportRow[] }>('/api/reports?limit=50'),
    ])
    if (sessionsRes.ok && sessionsRes.data) {
      setSessions(sessionsRes.data.logfiles)
      if (sessionsRes.data.logfiles.length > 0 && !selectedSession) {
        setSelectedSession(String(sessionsRes.data.logfiles[0].id))
      }
    }
    if (reportsRes.ok && reportsRes.data) setReports(reportsRes.data.reports)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, not derived state
    if (user) loadData()
  }, [user, loadData])

  const handleGenerate = async () => {
    if (!selectedSession) {
      setMessage({ type: 'error', text: 'Select a measurement session first' })
      return
    }
    setMessage(null)
    setGenerating(true)

    const res = await apiFetch<{ report: ReportRow }>('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ logfile_id: parseInt(selectedSession, 10), report_type: reportType }),
    })

    if (res.ok && res.data) {
      setMessage({ type: 'success', text: 'Report generated successfully' })
      setReports((prev) => [res.data!.report, ...prev])
    } else {
      setMessage({ type: 'error', text: res.error || 'Report generation failed' })
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600">Generate and download analysis reports</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow space-y-4">
        <h2 className="font-semibold text-gray-900">Generate New Report</h2>

        {sessions.length === 0 && !loading ? (
          <p className="text-sm text-gray-500">
            No measurement sessions available. Import one from the{' '}
            <a href="/user/measurements" className="text-blue-600 underline">Measurements</a> page first.
          </p>
        ) : (
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2 min-w-[220px]"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.session_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'kml' | 'excel' | 'csv')}
                className="rounded-lg border border-gray-300 px-4 py-2"
              >
                <option value="excel">Excel (.xlsx)</option>
                <option value="kml">KML (map)</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || sessions.length === 0}
              className="rounded-lg bg-purple-600 px-6 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {generating ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        )}

        {message && (
          <div className={`rounded-md p-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Reports</h2>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No reports generated yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="font-medium uppercase text-xs bg-gray-100 rounded px-2 py-1 mr-2">
                    {r.report_type}
                  </span>
                  <span className="text-sm text-gray-600">
                    {new Date(r.created_at).toLocaleString()} · {((r.file_size || 0) / 1024).toFixed(1)} KB
                  </span>
                </div>
                {r.download_url ? (
                  <a
                    href={r.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-gray-400 text-sm">Link expired</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
