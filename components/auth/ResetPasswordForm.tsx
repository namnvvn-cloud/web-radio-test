'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Destination page for the Supabase password-recovery email link (see
 * app/api/auth/forgot-password/route.ts). Supabase's client SDK auto-detects
 * the access_token in the URL fragment on load (detectSessionInUrl, the
 * default) and fires a PASSWORD_RECOVERY auth event once that session is
 * ready -- we wait for that instead of assuming the session already exists,
 * since parsing the fragment happens asynchronously right after mount.
 */
export function ResetPasswordForm() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    // Session may already be present by the time this effect runs.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    return () => listener?.subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setFormError(error.message || 'Could not reset password')
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/auth/signin'), 2500)
  }

  if (success) {
    return (
      <div className="w-full max-w-md space-y-4 rounded-lg bg-green-50 p-6 text-center">
        <div className="text-2xl">✓</div>
        <h2 className="text-lg font-semibold text-green-800">Password Updated</h2>
        <p className="text-green-700">You&apos;ll be redirected to sign in shortly.</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 text-center shadow">
        <p className="text-gray-600">
          Verifying your reset link… If this doesn&apos;t update in a few seconds, the link may
          have expired.
        </p>
        <Link href="/auth/signin" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Set a New Password</h1>
        <p className="text-gray-600">Choose a new password for your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{formError}</div>
        )}

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="••••••••"
          />
          <p className="text-xs text-gray-500">Minimum 6 characters</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
