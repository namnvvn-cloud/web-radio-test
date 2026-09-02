'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // onAuthStateChange fires once immediately with whatever session the
    // SDK currently has (event 'INITIAL_SESSION'), once its own storage
    // read finishes, and again on every later sign-in/sign-out/token
    // refresh. Driving ALL state from this single subscription -- rather
    // than also calling getSession() separately, as this used to -- avoids
    // two independent async paths racing to set the same React state.
    // That race was real: a stale/early 'INITIAL_SESSION' callback could
    // fire *after* a fresh sign-in had already set the correct session via
    // the separate getSession() call, clobbering it back to null and
    // leaving the UI convinced no one was signed in even though a fully
    // valid session was sitting in storage -- which sent every post-signin
    // redirect straight back to /auth/signin.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user || null)
        setError(null)

        // middleware.ts guards /user/* and /admin/* by looking for a
        // `sb-access-token` cookie -- it runs on the Edge before any client
        // JS, so it can't see the Supabase SDK's own session (which lives
        // in localStorage, not a cookie). Nothing else in the app ever wrote
        // that cookie, so middleware always saw it missing and bounced
        // every navigation to /user/* or /admin/* back to /auth/signin,
        // regardless of whether the SDK session was valid. Keeping the
        // cookie in sync here -- on every auth event, including the
        // INITIAL_SESSION fired on first mount -- covers email/password
        // sign-in, Google OAuth, token refresh, and sign-out in one place.
        if (newSession?.access_token) {
          const maxAge = newSession.expires_in ?? 3600
          const secure = window.location.protocol === 'https:' ? '; Secure' : ''
          document.cookie = `sb-access-token=${newSession.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`
        } else {
          document.cookie = 'sb-access-token=; path=/; max-age=0'
        }

        if (newSession?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', newSession.user.id)
            .single()

          setIsAdmin(profileData?.role === 'admin')
        } else {
          setIsAdmin(false)
        }

        setLoading(false)
      }
    )

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
