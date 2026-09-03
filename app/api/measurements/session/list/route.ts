import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/measurements/session/list — list the caller's own measurement
 * sessions (the session_id-based flow used by the RadioTest Android app,
 * via /api/measurements/session/start + /api/measurements/upload), most
 * recent first. Powers the "Phiên đo" web dashboard page.
 */
export async function GET(req: NextRequest) {
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

    const { data, error } = await supabaseAdmin
      .from('measurement_sessions')
      .select('id, mode, status, cell_file_used, started_at, ended_at, measurement_count')
      .eq('user_id', userData.user.id)
      .order('started_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    return NextResponse.json({ ok: true, sessions: data || [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
