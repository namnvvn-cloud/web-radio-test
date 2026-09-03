import ExcelJS from 'exceljs'
import type { Logfile, Measurement, UserProfile } from './types'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * RSRP-based color banding, roughly matching common coverage-map
 * conventions (green = strong, red = weak). Used for KML placemark
 * icon color so a session's map view reads at a glance.
 */
function rsrpColor(rsrp: number | null): string {
  // KML color format is AABBGGRR (alpha, blue, green, red)
  if (rsrp === null) return 'ff888888' // gray — no data
  if (rsrp >= -80) return 'ff00ff00' // green — excellent
  if (rsrp >= -95) return 'ff00ffff' // yellow — good
  if (rsrp >= -105) return 'ff0080ff' // orange — fair
  return 'ff0000ff' // red — poor
}

/**
 * Generate a KML document for a measurement session — one placemark per
 * measurement point, color-coded by RSRP, with a data table in each
 * point's description balloon.
 */
export function generateKML(logfile: Logfile, measurements: Measurement[]): string {
  const placemarks = measurements
    .filter((m) => m.latitude !== null && m.longitude !== null)
    .map((m) => {
      const name = m.cell_name || m.cell_id || `${m.rat || ''} ${m.nha_mang || ''}`.trim() || 'Measurement'
      const color = rsrpColor(m.rsrp)
      const description = `
        <![CDATA[
          <table>
            <tr><td><b>Time</b></td><td>${new Date(m.timestamp).toLocaleString()}</td></tr>
            <tr><td><b>Operator</b></td><td>${m.nha_mang || '-'}</td></tr>
            <tr><td><b>Technology</b></td><td>${m.rat || '-'}</td></tr>
            <tr><td><b>Band</b></td><td>${m.band || '-'}</td></tr>
            <tr><td><b>Cell</b></td><td>${m.cell_name || m.cell_id || '-'}</td></tr>
            <tr><td><b>RSRP</b></td><td>${m.rsrp ?? '-'} dBm</td></tr>
            <tr><td><b>RSRQ</b></td><td>${m.rsrq ?? '-'} dB</td></tr>
            <tr><td><b>SINR</b></td><td>${m.sinr ?? '-'} dB</td></tr>
            <tr><td><b>Download</b></td><td>${m.download_speed_mbps ?? '-'} Mbps</td></tr>
            <tr><td><b>Upload</b></td><td>${m.upload_speed_mbps ?? '-'} Mbps</td></tr>
          </table>
        ]]>
      `
      return `
    <Placemark>
      <name>${escapeXml(name)}</name>
      <description>${description}</description>
      <Style>
        <IconStyle>
          <color>${color}</color>
          <scale>0.8</scale>
          <Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>${m.longitude},${m.latitude},0</coordinates>
      </Point>
    </Placemark>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(logfile.session_name)}</name>
    <description>Web Radio Test — measurement session exported ${new Date().toISOString()}</description>
    ${placemarks}
  </Document>
</kml>`
}

/**
 * Generate an Excel workbook for a measurement session: one sheet with
 * raw measurement rows, one sheet with summary stats.
 */
export async function generateExcel(
  logfile: Logfile,
  measurements: Measurement[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Web Radio Test'
  workbook.created = new Date()

  // --- Summary sheet ---
  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { header: 'Field', key: 'field', width: 25 },
    { header: 'Value', key: 'value', width: 40 },
  ]
  summarySheet.addRows([
    { field: 'Session Name', value: logfile.session_name },
    { field: 'Session Date', value: new Date(logfile.session_date).toLocaleString() },
    { field: 'Notes', value: logfile.notes || '-' },
    { field: 'Total Measurements', value: measurements.length },
    { field: 'Generated', value: new Date().toLocaleString() },
  ])
  summarySheet.getRow(1).font = { bold: true }

  const numeric = (key: keyof Measurement) =>
    measurements.map((m) => m[key]).filter((v): v is number => typeof v === 'number')

  const stat = (values: number[]) =>
    values.length === 0
      ? { min: '-', avg: '-', max: '-' }
      : {
          min: Math.min(...values).toFixed(2),
          avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
          max: Math.max(...values).toFixed(2),
        }

  const statsSheet = workbook.addWorksheet('Statistics')
  statsSheet.columns = [
    { header: 'Metric', key: 'metric', width: 20 },
    { header: 'Min', key: 'min', width: 12 },
    { header: 'Avg', key: 'avg', width: 12 },
    { header: 'Max', key: 'max', width: 12 },
  ]
  statsSheet.getRow(1).font = { bold: true }
  for (const [label, key] of [
    ['RSRP (dBm)', 'rsrp'],
    ['RSRQ (dB)', 'rsrq'],
    ['SINR (dB)', 'sinr'],
    ['Download (Mbps)', 'download_speed_mbps'],
    ['Upload (Mbps)', 'upload_speed_mbps'],
  ] as const) {
    const s = stat(numeric(key))
    statsSheet.addRow({ metric: label, ...s })
  }

  // --- Raw data sheet ---
  const dataSheet = workbook.addWorksheet('Measurements')
  dataSheet.columns = [
    { header: 'Timestamp', key: 'timestamp', width: 22 },
    { header: 'Latitude', key: 'latitude', width: 12 },
    { header: 'Longitude', key: 'longitude', width: 12 },
    { header: 'Operator', key: 'nha_mang', width: 14 },
    { header: 'Technology', key: 'rat', width: 10 },
    { header: 'Band', key: 'band', width: 10 },
    { header: 'Cell ID', key: 'cell_id', width: 16 },
    { header: 'Cell Name', key: 'cell_name', width: 18 },
    { header: 'PCI', key: 'pci', width: 8 },
    { header: 'RSRP (dBm)', key: 'rsrp', width: 12 },
    { header: 'RSRQ (dB)', key: 'rsrq', width: 12 },
    { header: 'SINR (dB)', key: 'sinr', width: 12 },
    { header: 'Download (Mbps)', key: 'download_speed_mbps', width: 16 },
    { header: 'Upload (Mbps)', key: 'upload_speed_mbps', width: 14 },
  ]
  dataSheet.getRow(1).font = { bold: true }
  for (const m of measurements) {
    dataSheet.addRow({
      timestamp: new Date(m.timestamp).toLocaleString(),
      latitude: m.latitude,
      longitude: m.longitude,
      nha_mang: m.nha_mang,
      rat: m.rat,
      band: m.band,
      cell_id: m.cell_id,
      cell_name: m.cell_name,
      pci: m.pci,
      rsrp: m.rsrp,
      rsrq: m.rsrq,
      sinr: m.sinr,
      download_speed_mbps: m.download_speed_mbps,
      upload_speed_mbps: m.upload_speed_mbps,
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export type UserExportRow = UserProfile & {
  cellfiles_count: number
  logfiles_count: number
  reports_count: number
}

/**
 * Generate the Admin Users Excel export (Phase-2 "Export Excel danh sách
 * user"). One row per user, matching exactly the columns shown in
 * /admin/users so the download is a faithful copy of whatever
 * search/filter the admin currently has applied — see
 * app/api/admin/users/export/route.ts.
 */
export async function generateUsersExcel(users: UserExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Web Radio Test'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Users')
  sheet.columns = [
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Full name', key: 'full_name', width: 24 },
    { header: 'Phone', key: 'phone_number', width: 16 },
    { header: 'Operator', key: 'nha_mang_mac_dinh', width: 14 },
    { header: 'Tier', key: 'subscription_tier', width: 10 },
    { header: 'Role', key: 'role', width: 10 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Cellfiles', key: 'cellfiles_count', width: 10 },
    { header: 'Logfiles', key: 'logfiles_count', width: 10 },
    { header: 'Reports', key: 'reports_count', width: 10 },
    { header: 'Registered', key: 'created_at', width: 20 },
    { header: 'Last updated', key: 'updated_at', width: 20 },
  ]
  sheet.getRow(1).font = { bold: true }

  for (const u of users) {
    sheet.addRow({
      email: u.email,
      full_name: u.full_name || '-',
      phone_number: u.phone_number || '-',
      nha_mang_mac_dinh: u.nha_mang_mac_dinh,
      subscription_tier: u.subscription_tier,
      role: u.role,
      status: u.is_locked ? 'Locked' : 'Active',
      cellfiles_count: u.cellfiles_count,
      logfiles_count: u.logfiles_count,
      reports_count: u.reports_count,
      created_at: new Date(u.created_at).toLocaleString(),
      updated_at: new Date(u.updated_at).toLocaleString(),
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * Generate a CSV export (lightweight alternative to Excel, no extra
 * dependency — used internally and as a quick-download option).
 */
export function generateCSV(measurements: Measurement[]): string {
  const headers = [
    'timestamp', 'latitude', 'longitude', 'nha_mang', 'rat', 'band',
    'cell_id', 'cell_name', 'pci', 'rsrp', 'rsrq', 'sinr',
    'download_speed_mbps', 'upload_speed_mbps',
  ]
  const rows = measurements.map((m) =>
    headers.map((h) => {
      const v = (m as unknown as Record<string, unknown>)[h]
      if (v === null || v === undefined) return ''
      const s = String(v)
      return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}
