import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)

    // Verify token and get user
    const { data, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !data.user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Log sign out
    await supabaseAdmin.from('audit_log').insert({
      admin_id: data.user.id,
      action: 'user_signout',
      target_table: 'profiles',
      target_id: data.user.id,
      details: { email: data.user.email },
    })

    // Sign out (client should delete the session token)
    return NextResponse.json(
      {
        success: true,
        message: 'Signed out successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Sign out error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
