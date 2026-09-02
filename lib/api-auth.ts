import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase'
import { User } from '@supabase/supabase-js'

export type AuthResult =
  | { authenticated: true; user: User; isAdmin: boolean }
  | { authenticated: false; error: string; status: number }

/**
 * Verify the Authorization header (Bearer token) on an API request,
 * and resolve the caller's user + admin role.
 *
 * Usage in a route handler:
 *   const auth = await requireAuth(request)
 *   if (!auth.authenticated) {
 *     return NextResponse.json({ error: auth.error }, { status: auth.status })
 *   }
 *   const { user, isAdmin } = auth
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      authenticated: false,
      error: 'Missing or invalid authorization header',
      status: 401,
    }
  }

  const token = authHeader.slice(7)

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    return {
      authenticated: false,
      error: 'Invalid or expired token',
      status: 401,
    }
  }

  // Look up role from profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  return {
    authenticated: true,
    user: data.user,
    isAdmin: profile?.role === 'admin',
  }
}

/**
 * Like requireAuth, but also rejects non-admin callers.
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const auth = await requireAuth(request)

  if (!auth.authenticated) return auth

  if (!auth.isAdmin) {
    return {
      authenticated: false,
      error: 'Admin access required',
      status: 403,
    }
  }

  return auth
}

/**
 * Write an audit log entry. Never throws — logging failure should not
 * break the calling request.
 */
export async function logAudit(
  adminId: string,
  action: string,
  targetTable: string,
  targetId: string,
  details?: Record<string, unknown>
) {
  try {
    await supabaseAdmin.from('audit_log').insert({
      admin_id: adminId,
      action,
      target_table: targetTable,
      target_id: targetId,
      details: details || null,
    })
  } catch (err) {
    console.error('Audit log write failed:', err)
  }
}
