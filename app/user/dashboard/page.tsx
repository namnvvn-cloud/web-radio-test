'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api-client'

type Counts = {
  measurements: number
  cellfiles: number
  reports: number
}

export default function UserDashboardPage() {
  const { user } = useAuth()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [tier, setTier] = useState<string>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function load() {
      const [logfilesRes, cellfilesRes, reportsRes, profileRes] = await Promise.all([
        apiFetch<{ pagination: { total: number } }>('/api/logfiles?limit=1'),
        apiFetch<{ pagination: { total: number } }>('/api/cellfiles?limit=1'),
        apiFetch<{ pagination: { total: number } }>('/api/reports?limit=1'),
        apiFetch<{ profile: { subscription_tier: string } }>('/api/profile'),
      ])

      if (cancelled) return

      setCounts({
        measurements: logfilesRes.data?.pagination.total ?? 0,
        cellfiles: cellfilesRes.data?.pagination.total ?? 0,
        reports: reportsRes.data?.pagination.total ?? 0,
      })
      setTier(profileRes.data?.profile?.subscription_tier || 'free')
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to your measurement portal</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-2xl font-bold text-gray-900">
            {loading ? '…' : counts?.measurements ?? 0}
          </div>
          <p className="text-sm text-gray-600">Measurement Sessions</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-2xl font-bold text-gray-900">
            {loading ? '…' : counts?.cellfiles ?? 0}
          </div>
          <p className="text-sm text-gray-600">Cell Files</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-2xl font-bold text-gray-900">
            {loading ? '…' : counts?.reports ?? 0}
          </div>
          <p className="text-sm text-gray-600">Reports Generated</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-2xl font-bold text-gray-900 capitalize">
            {loading ? '…' : tier}
          </div>
          <p className="text-sm text-gray-600">Subscription Tier</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link
            href="/user/cellfiles"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors text-center"
          >
            Upload File
          </Link>
          <Link
            href="/user/measurements"
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors text-center"
          >
            New Measurement
          </Link>
          <Link
            href="/user/reports"
            className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 transition-colors text-center"
          >
            Generate Report
          </Link>
          <Link
            href="/user/profile"
            className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 transition-colors text-center"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Getting started */}
      {!loading && counts?.measurements === 0 && counts?.cellfiles === 0 && (
        <div className="rounded-lg bg-blue-50 p-6 border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Getting Started</h2>
          <p className="text-blue-800 text-sm">
            You haven&apos;t imported any data yet. Head to{' '}
            <Link href="/user/cellfiles" className="underline font-medium">Cell Files</Link> to
            bootstrap your existing station database, or{' '}
            <Link href="/user/measurements" className="underline font-medium">Measurements</Link>{' '}
            to import a past measurement session.
          </p>
        </div>
      )}
    </div>
  )
}
