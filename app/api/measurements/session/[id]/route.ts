import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/measurements/session/[id] — one measurement session (owned by
 * the caller) plus every measurement row uploaded into it. Powers the
 * "Phiên đo" detail page. `cell_id` / `serving_cell_id` come back from
 * Postgres as JS BigInt (bigint column) and are converted to strings
 * here since BigInt is not JSON-serializable.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('measurement_sessions')
      .select('id, user_id, mode, status, cell_file_used, started_at, ended_at, measurement_count')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
    }

    if (session.user_id !== userData.user.id) {
      return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
    }

    const { data: measurements, error: measurementsError } = await supabaseAdmin
      .from('measurements')
      .select(
        'id, timestamp, cell_id, pci, earfcn, nrarfcn, band, rat, bandwidth, rsrp, rsrq, sinr, ta, latitude, longitude, accuracy, mcc_mnc, serving_cell_id'
      )
      .eq('session_id', id)
      .order('timestamp', { ascending: true })
      .limit(2000);

    if (measurementsError) throw measurementsError;

    const rows = (measurements || []).map((m) => ({
      ...m,
      cell_id: m.cell_id === null ? null : String(m.cell_id),
      serving_cell_id: m.serving_cell_id === null ? null : String(m.serving_cell_id),
    }));

    return NextResponse.json({ ok: true, session, measurements: rows });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
