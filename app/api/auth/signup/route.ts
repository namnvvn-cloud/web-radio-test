import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()

    // Validate input
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Create user via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // User needs to confirm email
      user_metadata: {
        full_name: fullName,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    // Create user profile
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: fullName,
          role: 'user',
          subscription_tier: 'free',
          nha_mang_mac_dinh: 'MobiFone',
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Log but don't fail - user can update profile later
      }

      // Log audit action
      await supabaseAdmin.from('audit_log').insert({
        admin_id: authData.user.id,
        action: 'user_signup',
        target_table: 'profiles',
        target_id: authData.user.id,
        details: { email, full_name: fullName },
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully. Please check your email to confirm your account.',
        user: {
          id: authData.user?.id,
          email: authData.user?.email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
