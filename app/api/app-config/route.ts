import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    // Fetch from app_config table
    const { data, error } = await supabaseAdmin
      .from('app_config')
      .select('key, value')
      .in('key', ['minVersionCode', 'latestVersionCode', 'downloadUrl', 'notes']);

    if (error) throw error;

    // Transform to object
    const config: Record<string, string> = {};
    data.forEach((row) => {
      config[row.key] = row.value;
    });

    return NextResponse.json({
      ok: true,
      minVersionCode: parseInt(config.minVersionCode || '35'),
      latestVersionCode: parseInt(config.latestVersionCode || '37'),
      downloadUrl: config.downloadUrl || 'https://drive.google.com/drive/folders/1F8y-WXqFWyraInEGgR65Y6zXAATK8LGe',
      notes: config.notes || 'Version 37: Support data upload to web',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
