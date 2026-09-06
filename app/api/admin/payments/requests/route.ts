import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/api-auth'

/**
 * GET /api/admin/payments/requests?status=pending — danh sách yêu cầu
 * thanh toán để admin duyệt tay (Admin > Thanh toán). status mặc định
 * 'pending'; truyền status=all để xem hết lịch sử.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const status = request.nextUrl.searchParams.get('status') || 'pending'

  let query = supabaseAdmin
    .from('payment_requests')
    .select('*, profiles!payment_requests_user_id_fkey(email, full_name)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) {
    console.error('Admin payment requests fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch payment requests' }, { status: 500 })
  }

  const requests = (data || []).map((r) => {
    const { profiles, ...rest } = r as typeof r & {
      profiles: { email: string; full_name: string | null } | null
    }
    return { ...rest, user_email: profiles?.email, user_full_name: profiles?.full_name }
  })

  return NextResponse.json({ success: true, requests })
}
