'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'
import type { Cellfile } from '@/lib/types'

const VALID_OPERATORS = [
  'MobiFone', 'Viettel', 'VNPT', 'Vietnamobile',
  'Gmobile', 'Reddi', 'Elise', 'Itelecom', 'Wintel',
]
const VALID_RAT = ['2G', '3G', '4G', '5G']

/** Minimal CSV parser — handles quoted fields, no external dependency. */
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
        if (c === '"' && line[i + 1] === '"') {
          cur += '"'
          i++
        } else if (c === '"') {
          inQuotes = false
        } else {
          cur += c
        }
      } else if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        cells.push(cur)
        cur = ''
      } else {
        cur += c
      }
    }
    cells.push(cur)
    return cells
  }

  const headers = splitLine(lines[0]).map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cells = splitLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = (cells[i] || '').trim()
    })
    return row
  })
}

export default function CellfilesPage() {
  const { user } = useAuth()
  const [cellfiles, setCellfiles] = useState<Cellfile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadCellfiles = useCallback(async () => {
    setLoading(true)
    const res = await apiFetch<{ cellfiles: Cellfile[] }>('/api/cellfiles?limit=100')
    if (res.ok && res.data) {
      setCellfiles(res.data.cellfiles)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, not derived state
    if (user) loadCellfiles()
  }, [user, loadCellfiles])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMessage(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)

      if (rows.length === 0) {
        setMessage({ type: 'error', text: 'File has no data rows. Expected a CSV with header row.' })
        return
      }

      const cellfiles = rows.map((r) => ({
        site_name: r.site_name || r['ten_tram'] || '',
        cell_name: r.cell_name || r['ten_cell'] || '',
        latitude: parseFloat(r.latitude || r['vi_do'] || ''),
        longitude: parseFloat(r.longitude || r['kinh_do'] || ''),
        rat: (r.rat || r['cong_nghe'] || '').toUpperCase(),
        band: r.band || r['bang_tan'] || undefined,
        nha_mang: r.nha_mang || r.operator || undefined,
        azimuth: r.azimuth ? parseFloat(r.azimuth) : undefined,
        radius: r.radius ? parseFloat(r.radius) : undefined,
      }))

      // Client-side sanity check before sending, so users get an immediate
      // readable error instead of a generic 400 from the API
      const badRow = cellfiles.findIndex(
        (c) =>
          !c.site_name ||
          !c.cell_name ||
          Number.isNaN(c.latitude) ||
          Number.isNaN(c.longitude) ||
          !VALID_RAT.includes(c.rat)
      )
      if (badRow !== -1) {
        setMessage({
          type: 'error',
          text: `Row ${badRow + 1}: missing/invalid required field (site_name, cell_name, latitude, longitude, or rat must be one of ${VALID_RAT.join('/')})`,
        })
        return
      }

      setUploading(true)
      const res = await apiFetch<{ imported: number }>('/api/cellfiles', {
        method: 'POST',
        body: JSON.stringify({ cellfiles, source_file: file.name }),
      })

      if (res.ok && res.data) {
        setMessage({ type: 'success', text: `Imported ${res.data.imported} cell records from ${file.name}` })
        loadCellfiles()
      } else {
        setMessage({ type: 'error', text: res.error || 'Import failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to read file' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this cell record? This cannot be undone.')) return
    const res = await apiFetch(`/api/cellfiles/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCellfiles((prev) => prev.filter((c) => c.id !== id))
    } else {
      setMessage({ type: 'error', text: res.error || 'Delete failed' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cell Files</h1>
          <p className="text-gray-600">Import and manage your cell/site database</p>
        </div>
        <label className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 cursor-pointer">
          {uploading ? 'Uploading…' : 'Upload CSV'}
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>

      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600">
        <p className="font-medium mb-1">CSV format</p>
        <p>
          Required columns: <code className="bg-white px-1 rounded">site_name</code>,{' '}
          <code className="bg-white px-1 rounded">cell_name</code>,{' '}
          <code className="bg-white px-1 rounded">latitude</code>,{' '}
          <code className="bg-white px-1 rounded">longitude</code>,{' '}
          <code className="bg-white px-1 rounded">rat</code> (2G/3G/4G/5G). Optional:{' '}
          <code className="bg-white px-1 rounded">band</code>,{' '}
          <code className="bg-white px-1 rounded">nha_mang</code> ({VALID_OPERATORS.join(', ')}),{' '}
          <code className="bg-white px-1 rounded">azimuth</code>,{' '}
          <code className="bg-white px-1 rounded">radius</code>.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-md p-4 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-lg bg-white shadow overflow-x-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        ) : cellfiles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No cell files uploaded yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Site</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Cell</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Operator</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900">RAT</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Band</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Coordinates</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cellfiles.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{c.site_name}</td>
                  <td className="px-4 py-2">{c.cell_name}</td>
                  <td className="px-4 py-2">{c.nha_mang || '-'}</td>
                  <td className="px-4 py-2">{c.rat}</td>
                  <td className="px-4 py-2">{c.band || '-'}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(c.id)}
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
