'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'
import type { BenchmarkAggregate } from '@/lib/types'

const VALID_OPERATORS = [
  'MobiFone', 'Viettel', 'VNPT', 'Vietnamobile',
  'Gmobile', 'Reddi', 'Elise', 'Itelecom', 'Wintel',
]
const VALID_RAT = ['2G', '3G', '4G', '5G']

export default function BenchmarksPage() {
  const { user, isAdmin } = useAuth()
  const [benchmarks, setBenchmarks] = useState<BenchmarkAggregate[]>([])
  const [loading, setLoading] = useState(true)
  const [operator, setOperator] = useState('')
  const [rat, setRat] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '100' })
    if (operator) params.set('nha_mang', operator)
    if (rat) params.set('rat', rat)
    const res = await apiFetch<{ benchmarks: BenchmarkAggregate[] }>(`/api/admin/benchmarks?${params}`)
    if (res.ok && res.data) setBenchmarks(res.data.benchmarks)
    setLoading(false)
  }, [operator, rat])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, not derived state
    if (user && isAdmin) load()
  }, [user, isAdmin, load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Benchmark Aggregates</h1>
        <p className="text-gray-600">View anonymized aggregated measurement data by geographic region</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow space-y-4">
        <h2 className="font-semibold text-gray-900">Filters</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Operator</label>
            <select value={operator} onChange={(e) => setOperator(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2">
              <option value="">All Operators</option>
              {VALID_OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Technology</label>
            <select value={rat} onChange={(e) => setRat(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2">
              <option value="">All Technologies</option>
              {VALID_RAT.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={load} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Location</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Operator</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Tech</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Avg RSRP</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Avg Speed</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-900">Samples</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
            ) : benchmarks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No benchmark data yet — the nightly aggregation job (SOP §4.4, Phase 2) has not run.
                  This will populate once implemented.
                </td>
              </tr>
            ) : (
              benchmarks.map((b) => (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</td>
                  <td className="px-4 py-2">{b.nha_mang}</td>
                  <td className="px-4 py-2">{b.rat || '-'}</td>
                  <td className="px-4 py-2">{b.avg_rsrp?.toFixed(1) ?? '-'} dBm</td>
                  <td className="px-4 py-2">{b.avg_download_mbps?.toFixed(1) ?? '-'} Mbps</td>
                  <td className="px-4 py-2">{b.sample_count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
