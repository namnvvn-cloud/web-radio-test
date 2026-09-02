import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth, logAudit } from '@/lib/api-auth'
import { generateKML, generateExcel, generateCSV } from '@/lib/report-generators'
import type { Logfile, Measurement } from '@/lib/types'

const VALID_TYPES = ['kml', 'excel', 'csv']

/**
 * POST /api/reports/generate — generate a report for a measurement session
 * Body: { logfile_id: number, report_type: 'kml' | 'excel' | 'csv' }
 *
 * Word ('word' in the schema) and PNG (map screenshot) report types are
 * not implemented yet — they need a docx template + a headless map
 * renderer respectively; both are Phase 2 candidates. This endpoint
 * covers the two formats explicitly named in SOP §4.5 (Excel, KML) plus
 * a CSV fallback.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const { logfile_id, report_type } = body

    if (!logfile_id) {
      return NextResponse.json({ error: 'logfile_id is required' }, { status: 400 })
    }

    if (!report_type || !VALID_TYPES.includes(report_type)) {
      return NextResponse.json(
        { error: `report_type must be one of: ${VALID_TYPES.join(', ')} (word/png not yet available)` },
        { status: 400 }
      )
    }

    // Fetch logfile (must belong to caller)
    const { data: logfile, error: logfileError } = await supabaseAdmin
      .from('logfiles')
      .select('*')
      .eq('id', logfile_id)
      .eq('user_id', auth.user.id)
      .single<Logfile>()

    if (logfileError || !logfile) {
      return NextResponse.json({ error: 'Logfile not found or not owned by you' }, { status: 404 })
    }

    // Fetch all measurements for this session
    const { data: measurements, error: measError } = await supabaseAdmin
      .from('measurements')
      .select('*')
      .eq('logfile_id', logfile_id)
      .order('timestamp', { ascending: true })
      .limit(50000)
      .returns<Measurement[]>()

    if (measError) {
      console.error('Measurements fetch error:', measError)
      return NextResponse.json({ error: 'Failed to load measurements' }, { status: 500 })
    }

    if (!measurements || measurements.length === 0) {
      return NextResponse.json({ error: 'This session has no measurements to report on' }, { status: 400 })
    }

    // Generate the file
    let fileBuffer: Buffer
    let extension: string
    let contentType: string
    let dbReportType: 'word' | 'excel' | 'kml' | 'png'

    if (report_type === 'kml') {
      fileBuffer = Buffer.from(generateKML(logfile, measurements), 'utf-8')
      extension = 'kml'
      contentType = 'application/vnd.google-earth.kml+xml'
      dbReportType = 'kml'
    } else if (report_type === 'excel') {
      fileBuffer = await generateExcel(logfile, measurements)
      extension = 'xlsx'
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      dbReportType = 'excel'
    } else {
      fileBuffer = Buffer.from(generateCSV(measurements), 'utf-8')
      extension = 'csv'
      contentType = 'text/csv'
      dbReportType = 'excel' // schema has no 'csv' type — closest semantic match
    }

    const safeSessionName = logfile.session_name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60)
    const storagePath = `${auth.user.id}/${logfile_id}_${safeSessionName}_${Date.now()}.${extension}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('reports')
      .upload(storagePath, fileBuffer, { contentType, upsert: false })

    if (uploadError) {
      console.error('Report upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to store generated report: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data: reportRow, error: insertError } = await supabaseAdmin
      .from('reports')
      .insert({
        user_id: auth.user.id,
        logfile_id,
        report_type: dbReportType,
        file_url: storagePath,
        file_size: fileBuffer.byteLength,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Report row insert error:', insertError)
      return NextResponse.json({ error: 'Report generated but failed to save record' }, { status: 500 })
    }

    await logAudit(auth.user.id, 'report_generated', 'reports', String(reportRow.id), {
      logfile_id,
      report_type,
      measurement_count: measurements.length,
    })

    const { data: signed } = await supabaseAdmin.storage
      .from('reports')
      .createSignedUrl(storagePath, 3600)

    return NextResponse.json(
      {
        success: true,
        report: { ...reportRow, download_url: signed?.signedUrl || null },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Report generate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
