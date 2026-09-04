'use client'

import { useAuth } from '@/lib/auth-context'
import { useSignOut } from '@/lib/auth-hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, isAdmin } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { signOut, loading: signingOut } = useSignOut()

  // Nút "Sign Out" trước đây không có onClick -- cùng bug với app/user/layout.tsx (04/09/2026).
  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/signin')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    router.push('/auth/signin')
    return null
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to access this area.</p>
          <Link href="/user/dashboard" className="text-blue-600 hover:text-blue-700">
            Go to user dashboard
          </Link>
        </div>
      </div>
    )
  }

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/benchmarks', label: 'Benchmarks', icon: '📈' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-red-900 text-white transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="p-4 border-b border-red-800 flex items-center justify-between">
          {sidebarOpen && <h1 className="font-bold text-lg">Admin Panel</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-red-800 rounded"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/user/dashboard"
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-red-800 hover:bg-red-700 transition-colors mb-2"
          >
            <span className="text-xl">↩️</span>
            {sidebarOpen && <span className="font-medium">My Dashboard</span>}
          </Link>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-red-800 transition-colors"
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-red-800">
          {sidebarOpen && (
            <div className="mb-4 text-sm">
              <p className="text-red-300">Admin account</p>
              <p className="font-medium truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-60 rounded-lg text-sm font-medium"
          >
            {signingOut ? 'Đang đăng xuất...' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
