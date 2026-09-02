import { supabase } from './supabase'

/**
 * Sign up a new user with email and password
 */
export async function signUpWithEmail(email: string, password: string, fullName: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) throw error

    return {
      success: true,
      user: data.user,
      session: data.session,
    }
  } catch (error) {
    console.error('Sign up error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign up failed',
    }
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    return {
      success: true,
      user: data.user,
      session: data.session,
    }
  } catch (error) {
    console.error('Sign in error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign in failed',
    }
  }
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    })

    if (error) throw error

    return {
      success: true,
      url: data.url,
    }
  } catch (error) {
    console.error('Google sign in error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Google sign in failed',
    }
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) throw error

    return {
      success: true,
    }
  } catch (error) {
    console.error('Sign out error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign out failed',
    }
  }
}

/**
 * Get the current user
 */
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) throw error

    return {
      success: true,
      user: data.user,
    }
  } catch (error) {
    console.error('Get user error:', error)
    return {
      success: false,
      user: null,
    }
  }
}

/**
 * Get the current session
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) throw error

    return {
      success: true,
      session: data.session,
    }
  } catch (error) {
    console.error('Get session error:', error)
    return {
      success: false,
      session: null,
    }
  }
}

/**
 * Reset password for user
 */
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
    })

    if (error) throw error

    return {
      success: true,
    }
  } catch (error) {
    console.error('Reset password error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Reset password failed',
    }
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error

    return {
      success: true,
    }
  } catch (error) {
    console.error('Update password error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update password failed',
    }
  }
}
