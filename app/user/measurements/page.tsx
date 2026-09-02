'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'
import type { Logfile } from '@/lib/types'

const VALID_RAT = ['2G', '3G', '4G', '5G']
const VALID_OPERATORS = [
  'MobiFone', 'Viettel', 'VNPT', 'Vietnamobile',
  'Gmobile', 'Reddi', 'Elise', 'Itelecom', 'Wintel',
]

type LogfileRow = Logfile & { measurements: { count: number }[] }

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const splitLine = (line: string): string[] => {
    const cells: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
        else if (c === '"') { inQuotes = false }
        else cur += c
      } else if (c === '"') { inQuotes = true }
      else if (c === ',') { cells.push(cur); cur = '' }
      else cur += c
    }
    cells.push(cur)
    return cells
  }
  const headers = splitLine(lines[0]).map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cells = splitLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (cells[i] || '').trim() })
    return row
  })
}

export default function MeasurementsPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<LogfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [sessionName, setSessionName] = useState('')

  const loadSessions = useCallback(async () => {
    setLoading(true)
    const res = await apiFetch<{ logfiles: LogfileRow[] }>('/api/logfiles?limit=50')
    if (res.ok && res.data) setSessions(res.data.logfiles)
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, not derived state
    if (user) loadSessions()
  }, [user, loadSessions])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMessage(null)

    const name = sessionName.trim() || file.name.replace(/\.[^.]+$/, '')

    try {
      const text = await file.text()
      const rows = parseCSV(text)
      if (rows.length === 0) {
        setMessage({ type: 'error', text: 'File has no data rows.' })
        return
      }

      const measurements = rows.map((r) => ({
        timestamp: r.timestamp || undefined,
        latitude: r.latitude ? parseFloat(r.latitude) : undefined,
        longitude: r.longitude ? parseFloat(r.longitude) : undefined,
        cell_id: r.cell_id || undefined,
        cell_name: r.cell_name || undefined,
        rsrp: r.rsrp ? parseFloat(r.rsrp) : undefined,
        rsrq: r.rsrq ? parseFloat(r.rsrq) : undefined,
        sinr: r.sinr ? parseFloat(r.sinr) : undefined,
        rat: r.rat ? r.rat.toUpperCase() : undefined,
        band: r.band || undefined,
        nha_mang: r.nha_mang || r.operator || undefined,
        download_speed_mbps: r.download_speed_mbps ? parseFloat(r.download_speed_mbps) : undefined,
        upload_speed_mbps: r.upload_speed_mbps ? parseFloat(r.upload_speed_mbps) : undefined,
      }))

      setUploading(true)

      // 1. Create the session
      const logfileRes = await apiFetch<{ logfile: Logfile }>('/api/logfiles', {
        method: 'POST',
        body: JSON.stringify({ session_name: name }),
      })

      if (!logfileRes.ok || !logfileRes.data) {
        setMessage({ type: 'error', text: logfileRes.error || 'Failed to create session' })
        return
      }

      // 2. Bulk import its measurements
      const measRes = await apiFetch<{ imported: number }>('/api/measurements', {
        method: 'POST',
        body: JSON.stringify({ logfile_id: logfileRes.data.logfile.id, measurements }),
      })

      if (measRes.ok && measRes.data) {
        setMessage({ type: 'success', text: `Session "${name}" created with ${measRes.data.imported} measurements` })
        setSessionName('')
        loadSessions()
      } else {
        setMessage({ type: 'error', text: measRes.error || 'Session created but measurement import failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to read file' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this session and all its measurements? This cannot be undone.')) return
    const res = await apiFetch(`/api/logfiles/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } else {
      setMessage({ type: 'error', text: res.error || 'Delete failed' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Measurements</h1>
          <p className="text-gray-600">View and import your signal measurement sessions</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Session name (optional)"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm w-56"
          />
          <label className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 cursor-pointer text-sm">
            {uploading ? 'Uploading…' : 'Upload CSV Session'}
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600">
        <p className="font-medium mb-1">CSV format</p>
        <p>
          Optional columns per row: <code className="bg-white px-1 rounded">timestamp</code>,{' '}
          <code className="bg-white px-1 rounded">latitude</code>,{' '}
          <code className="bg-white px-1 rounded">longitude</code>,{' '}
          <code className="bg-white px-1 rounded">rsrp</code>,{' '}
          <code className="bg-white px-1 rounded">rsrq</code>,{' '}
          <code className="bg-white px-1 rounded">sinr</code>,{' '}
          <code className="bg-white px-1 rounded">rat</code> ({VALID_RAT.join('/')}),{' '}
          <code className="bg-white px-1 rounded">band</code>,{' '}
          <code className="bg-white px-1 rounded">nha_mang</code> ({VALID_OPERATORS.join(', ')}),{' '}
          <code className="bg-white px-1 rounded">download_speed_mbps</code>,{' '}
          <code className="bg-white px-1 rounded">upload_speed_mbps</code>.
        </p>
      </div>

      {message && (
        <div className={`rounded-md p-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="rounded-lg bg-white shadow overflow-x-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No measurement sessions yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Session</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Date</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Measurements</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{s.session_name}</td>
                  <td className="px-4 py-2">{new Date(s.session_date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{s.measurements?.[0]?.count ?? 0}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                    >
                      Delete
                    </button>
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
