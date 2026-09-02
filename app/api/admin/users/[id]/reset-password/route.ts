import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin, logAudit } from '@/lib/api-auth'

/**
 * POST /api/admin/users/[id]/reset-password — send a password reset email
 * Admin-only (SOP §4.1: "đặt lại mật khẩu hộ (không xem được mật khẩu —
 * chỉ Supabase Auth mới giữ)"). This sends the standard Supabase Auth
 * reset-password email to the user rather than setting a password
 * directly, so no one -- including this admin action -- ever sees or
 * chooses the user's new password.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', id)
    .single()

  if (!profile?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${request.nextUrl.origin}/auth/reset-password`,
  })

  if (error) {
    console.error('Admin-triggered password reset error:', error)
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
  }

  await logAudit(auth.user.id, 'password_reset_sent', 'profiles', id, {
    email: profile.email,
  })

  return NextResponse.json({ success: true, message: `Reset email sent to ${profile.email}` })
}
