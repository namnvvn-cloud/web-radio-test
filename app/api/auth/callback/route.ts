import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * OAuth callback handler for Google and other providers
 * Handles the redirect back from OAuth provider
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error, error_description)
      return NextResponse.redirect(
        new URL(`/auth/signin?error=${encodeURIComponent(error_description || error)}`, request.url)
      )
    }

    // Exchange code for session
    if (code) {
      const { data, error: exchangeError } = await supabaseAdmin.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Session exchange error:', exchangeError)
        return NextResponse.redirect(
          new URL('/auth/signin?error=Failed to authenticate', request.url)
        )
      }

      // Create or update user profile
      if (data.user) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              email: data.user.email || '',
              full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
              role: 'user',
              subscription_tier: 'free',
              nha_mang_mac_dinh: 'MobiFone',
            },
            { onConflict: 'id' }
          )

        if (profileError) {
          console.error('Profile upsert error:', profileError)
          // Continue anyway - user can update profile manually
        }

        // Log OAuth sign in
        await supabaseAdmin.from('audit_log').insert({
          admin_id: data.user.id,
          action: 'oauth_signin',
          target_table: 'profiles',
          target_id: data.user.id,
          details: { provider: 'google', email: data.user.email },
        })
      }

      // Redirect to user portal
      return NextResponse.redirect(new URL('/user/dashboard', request.url))
    }

    return NextResponse.redirect(new URL('/auth/signin?error=Invalid callback', request.url))
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(
      new URL('/auth/signin?error=An error occurred during authentication', request.url)
    )
  }
}
