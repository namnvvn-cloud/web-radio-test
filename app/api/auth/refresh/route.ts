import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json()

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      )
    }

    // Refresh the session
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token,
    })

    if (error || !data.session) {
      console.error('Token refresh error:', error)
      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
