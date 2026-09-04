'use client'

import { useAuth } from '@/lib/auth-context'
import { useSignOut } from '@/lib/auth-hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { signOut, loading: signingOut } = useSignOut()

  // Nút "Sign Out" trước đây không có onClick -- bấm không có phản ứng gì,
  // không cách nào đăng xuất để đăng nhập tài khoản khác (04/09/2026).
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

  const navItems = [
    { href: '/user/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/user/cellfiles', label: 'Cell Files', icon: '📁' },
    { href: '/user/measurements', label: 'Measurements', icon: '📡' },
    { href: '/user/sessions', label: 'Phiên đo', icon: '📶' },
    { href: '/user/reports', label: 'Reports', icon: '📄' },
    { href: '/user/upgrade', label: 'Nâng cấp gói', icon: '⭐' },
    { href: '/user/profile', label: 'Profile', icon: '👤' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {sidebarOpen && <h1 className="font-bold text-lg">Web Radio</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-800 rounded"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          {sidebarOpen && (
            <div className="mb-4 text-sm">
              <p className="text-gray-400">Logged in as</p>
              <p className="font-medium truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg text-sm font-medium"
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
