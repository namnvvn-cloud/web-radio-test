import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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
    const { sessionId, status } = body;

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'Missing sessionId' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('measurement_sessions')
      .update({
        status: status || 'COMPLETED',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', userData.user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true, sessionId });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
