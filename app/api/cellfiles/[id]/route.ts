import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET /api/cellfiles/[id] — fetch one cellfile (must belong to caller, or caller is admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (Number.isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid cellfile id' }, { status: 400 })
  }

  let query = supabaseAdmin.from('cellfiles').select('*').eq('id', numericId)
  if (!auth.isAdmin) {
    query = query.eq('user_id', auth.user.id)
  }

  const { data, error } = await query.single()

  if (error || !data) {
    return NextResponse.json({ error: 'Cellfile not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, cellfile: data })
}

/**
 * DELETE /api/cellfiles/[id] — delete one cellfile owned by the caller
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (Number.isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid cellfile id' }, { status: 400 })
  }

  let query = supabaseAdmin.from('cellfiles').delete().eq('id', numericId)
  if (!auth.isAdmin) {
    query = query.eq('user_id', auth.user.id)
  }

  const { data, error } = await query.select('id')

  if (error) {
    console.error('Cellfile delete error:', error)
    return NextResponse.json({ error: 'Failed to delete cellfile' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Cellfile not found or not owned by you' }, { status: 404 })
  }

  return NextResponse.json({ success: true, deleted: numericId })
}
