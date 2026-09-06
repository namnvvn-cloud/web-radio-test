import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/cron/expire-subscriptions — hạ user 'pro' về 'free' khi
 * subscriptions.billing_cycle_end của dòng 'completed' mới nhất đã qua
 * (yêu cầu 06/09/2026: hết hạn tự động về Free, không cần admin theo
 * dõi tay). Gọi mỗi ngày bởi Vercel Cron (xem vercel.json).
 *
 * Bảo vệ bằng CRON_SECRET — Vercel Cron tự gửi header
 * "Authorization: Bearer $CRON_SECRET" nếu biến môi trường CRON_SECRET
 * tồn tại; không set thì endpoint từ chối mọi request để tránh ai cũng
 * gọi được và hạ cấp bừa user.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET chưa được cấu hình' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()

  // Với mỗi user đang 'pro', lấy dòng subscriptions 'completed' mới nhất
  // của họ — nếu billing_cycle_end đã qua, hạ về 'free'. Data nhỏ (vài
  // trăm user là nhiều), nên xử lý ở app code cho dễ đọc thay vì 1 câu
  // SQL lồng nhau khó bảo trì.
  const { data: proProfiles, error: profilesErr } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('subscription_tier', 'pro')

  if (profilesErr) {
    console.error('expire-subscriptions: fetch pro profiles failed', profilesErr)
    return NextResponse.json({ error: 'Failed to fetch pro profiles' }, { status: 500 })
  }

  const expiredUserIds: string[] = []

  for (const p of proProfiles || []) {
    const { data: latest } = await supabaseAdmin
      .from('subscriptions')
      .select('billing_cycle_end')
      .eq('user_id', p.id)
      .eq('payment_status', 'completed')
      .order('billing_cycle_end', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latest?.billing_cycle_end && latest.billing_cycle_end < nowIso) {
      expiredUserIds.push(p.id)
    }
    // Không có dòng subscriptions 'completed' nào nhưng vẫn 'pro' (vd.
    // admin gán tay ở /admin/users) -- không tự đụng vào, chỉ cron xử lý
    // những gói đến hạn từ chính hệ thống thanh toán.
  }

  if (expiredUserIds.length > 0) {
    const { error: downgradeErr } = await supabaseAdmin
      .from('profiles')
      .update({ subscription_tier: 'free', updated_at: nowIso })
      .in('id', expiredUserIds)

    if (downgradeErr) {
      console.error('expire-subscriptions: downgrade failed', downgradeErr)
      return NextResponse.json({ error: 'Failed to downgrade expired users' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, checked: proProfiles?.length || 0, downgraded: expiredUserIds.length })
}
