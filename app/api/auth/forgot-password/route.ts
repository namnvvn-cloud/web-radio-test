import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function siteUrl(): string {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://web-radio-test.vercel.app'
}

/**
 * POST /api/auth/forgot-password — Phase 1b (Android): replaces the old Apps
 * Script "action=forgot" flow (which generated a random password server-side
 * and emailed it). The new backend is Supabase Auth, which already has a
 * built-in password-recovery email (the same delivery mechanism used for the
 * signup confirmation email — no separate email service configured for this
 * project), so we use that instead of inventing a custom email path.
 *
 * Body: { email: string }
 *
 * Always responds 200 { success: true } regardless of whether the email
 * belongs to an account -- this must not leak account existence. The
 * recovery link lands on /auth/reset-password to actually set the new
 * password (both web and Android users complete the reset in a browser).
 */
export async function POST(request: NextRequest) {
    try {
          const { email } = await request.json()

      if (!email || typeof email !== 'string' || email.trim().length === 0) {
              return NextResponse.json({ error: 'Email is required' }, { status: 400 })
      }

      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email.trim(), {
              redirectTo: `${siteUrl()}/auth/reset-password`,
      })

      if (error) {
              // Logged for ops visibility only -- never surfaced to the caller,
            // so a wrong/unregistered email can't be distinguished from a real one.
            console.error('Forgot-password error:', error)
      }

      return NextResponse.json({ success: true })
    } catch (error) {
          console.error('Forgot-password POST error:', error)
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
