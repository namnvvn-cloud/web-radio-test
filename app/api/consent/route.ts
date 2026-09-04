import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/consent — Phase 1b mục 2 (04/09/2026): app Android gọi lên đây ngay sau khi người
 * dùng bấm "Đồng ý và tiếp tục" ở popup Điều khoản dịch vụ & Chính sách bảo mật (xem
 * MainActivity.showConsentDialog() + Backend.submitConsent()). Ghi 1 dòng MỚI vào
 * consent_log mỗi lần đồng ý -- không update/xoá, giữ đủ lịch sử làm bằng chứng.
 *
 * Body: { termsVersion: string, consented: boolean }
 * Header: Authorization: Bearer <supabase access token>
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const termsVersion = typeof body?.termsVersion === 'string' ? body.termsVersion.trim() : '';
    const consented = body?.consented !== false; // mặc định true -- endpoint chỉ được gọi khi đồng ý

    if (!termsVersion) {
      return NextResponse.json({ ok: false, error: 'termsVersion is required' }, { status: 400 });
    }

    const { error: insertError } = await supabaseAdmin
      .from('consent_log')
      .insert({
        user_id: userData.user.id,
        terms_version: termsVersion,
        consented,
      });

    if (insertError) throw insertError;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'POST to this endpoint with { termsVersion, consented } and an Authorization: Bearer <token> header' },
    { status: 200 }
  );
}
