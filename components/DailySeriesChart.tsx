'use client'

import { useState } from 'react'

export type DailyPoint = { date: string; registrations: number; app_opens: number }

/**
 * Lightweight inline SVG line chart for the admin dashboard's 30-day
 * registrations/app-opens trend (Phase 2). Deliberately hand-drawn with
 * plain SVG rather than a charting library — the data is a single small
 * series (30 points) and this avoids adding a new dependency for it.
 */
export default function DailySeriesChart({ data }: { data: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)

  const width = 720
  const height = 220
  const padding = { top: 16, right: 16, bottom: 28, left: 36 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.registrations, d.app_opens)))
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0

  const x = (i: number) => padding.left + i * stepX
  const y = (v: number) => padding.top + innerH - (v / maxVal) * innerH

  const pathFor = (key: 'registrations' | 'app_opens') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(' ')

  const yTicks = [0, 0.5, 1].map((f) => Math.round(maxVal * f))

  const fmtDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00Z')
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Registrations and app opens, last 30 days">
        {/* gridlines + y-axis labels */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padding.left} x2={width - padding.right} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={padding.left - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="#6b7280">{t}</text>
          </g>
        ))}

        {/* x-axis labels: every ~5th day to avoid crowding */}
        {data.map((d, i) =>
          i % 5 === 0 ? (
            <text key={d.date} x={x(i)} y={height - 8} textAnchor="middle" fontSize={10} fill="#6b7280">
              {fmtDate(d.date)}
            </text>
          ) : null
        )}

        <path d={pathFor('registrations')} fill="none" stroke="#b91c1c" strokeWidth={2} />
        <path d={pathFor('app_opens')} fill="none" stroke="#2563eb" strokeWidth={2} />

        {data.map((d, i) => (
          <g key={d.date}>
            <circle cx={x(i)} cy={y(d.registrations)} r={hover === i ? 4 : 2.5} fill="#b91c1c" />
            <circle cx={x(i)} cy={y(d.app_opens)} r={hover === i ? 4 : 2.5} fill="#2563eb" />
            {/* wide invisible hit target for hover */}
            <rect
              x={x(i) - stepX / 2}
              y={padding.top}
              width={stepX || innerW}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            />
          </g>
        ))}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={padding.top} y2={height - padding.bottom} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>

      <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
        <div className="flex gap-4">
          <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-700" /> Registrations</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" /> App opens</span>
        </div>
        {hover !== null && data[hover] && (
          <span className="font-medium text-gray-900">
            {fmtDate(data[hover].date)}: {data[hover].registrations} đăng ký, {data[hover].app_opens} lượt mở
          </span>
        )}
      </div>
    </div>
  )
}
