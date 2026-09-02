import { useCallback, useState } from 'react'
import { supabase } from './supabase'

/**
 * Hook for sign up with email
 */
export function useSignUp() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Sign up failed')
        }

        return {
          success: true,
          data,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        return {
          success: false,
          error: message,
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { signUp, loading, error }
}

/**
 * Hook for sign in with email
 */
export function useSignIn() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Sign in failed')
        }

        // Store session tokens in localStorage
        if (data.session?.access_token) {
          localStorage.setItem('access_token', data.session.access_token)
          localStorage.setItem('refresh_token', data.session.refresh_token)
        }

        return {
          success: true,
          data,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        return {
          success: false,
          error: message,
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { signIn, loading, error }
}

/**
 * Hook for sign in with Google
 */
export function useSignInGoogle() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signInGoogle = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (oauthError) {
        throw oauthError
      }

      if (data?.url) {
        window.location.href = data.url
      }

      return {
        success: true,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign in failed'
      setError(message)
      return {
        success: false,
        error: message,
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return { signInGoogle, loading, error }
}

/**
 * Hook for sign out
 */
export function useSignOut() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signOut = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        throw signOutError
      }

      // Clear stored tokens
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')

      return {
        success: true,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed'
      setError(message)
      return {
        success: false,
        error: message,
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return { signOut, loading, error }
}

/**
 * Hook for password reset
 */
export function usePasswordReset() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true)
    setError(null)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (resetError) {
        throw resetError
      }

      return {
        success: true,
        message: 'Password reset link sent to your email',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset failed'
      setError(message)
      return {
        success: false,
        error: message,
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return { resetPassword, loading, error }
}
