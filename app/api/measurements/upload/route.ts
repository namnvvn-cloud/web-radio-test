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
    const { sessionId, measurements } = body;

    if (!sessionId || !Array.isArray(measurements) || measurements.length === 0) {
      return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
    }

    // Parse CSV lines into measurement objects
    const rows = measurements.map((csv: string) => {
      const parts = csv.split(',');
      return {
        session_id: sessionId,
        user_id: userData.user.id,
        timestamp: parts[0] || new Date().toISOString(),
        cell_id: parts[1] ? BigInt(parts[1]) : null,
        pci: parts[2] ? parseInt(parts[2]) : null,
        earfcn: parts[3] ? parseInt(parts[3]) : null,
        nrarfcn: parts[4] ? parseInt(parts[4]) : null,
        band: parts[5] ? parseInt(parts[5]) : null,
        rat: parts[6] || null,
        bandwidth: parts[7] ? parseInt(parts[7]) : null,
        rsrp: parts[8] ? parseInt(parts[8]) : null,
        rsrq: parts[9] ? parseInt(parts[9]) : null,
        sinr: parts[10] ? parseInt(parts[10]) : null,
        ta: parts[11] ? parseInt(parts[11]) : null,
        latitude: parts[12] ? parseFloat(parts[12]) : null,
        longitude: parts[13] ? parseFloat(parts[13]) : null,
        accuracy: parts[14] ? parseFloat(parts[14]) : null,
        mcc_mnc: parts[15] || null,
        serving_cell_id: parts[16] ? BigInt(parts[16]) : null,
      };
    });

    const { error: insertError } = await supabaseAdmin
      .from('measurements')
      .insert(rows);

    if (insertError) throw insertError;

    // Update session measurement count
    await supabaseAdmin
      .from('measurement_sessions')
      .update({ measurement_count: measurements.length })
      .eq('id', sessionId);

    return NextResponse.json({ ok: true, uploaded: measurements.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
