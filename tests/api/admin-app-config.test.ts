import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth so every request is treated as an authenticated admin — the
// route's own admin-gating is requireAdmin()'s job, tested separately in
// tests/lib. Mock supabaseAdmin so no real network/DB call is made.
vi.mock('@/lib/api-auth', () => ({
  requireAdmin: vi.fn(async () => ({
    authenticated: true,
    user: { id: 'admin-1' },
    isAdmin: true,
  })),
  logAudit: vi.fn(async () => undefined),
}))

const selectMock = vi.fn()
const upsertMock = vi.fn()

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: selectMock,
      upsert: upsertMock,
    })),
  },
}))

function makeSelectChain(result: { data: unknown; error: unknown }) {
  return { in: vi.fn(async () => result) }
}

describe('GET /api/admin/app-config', () => {
  beforeEach(() => {
    vi.resetModules()
    selectMock.mockReset()
    upsertMock.mockReset()
  })

  it('normalizes a timestamp-without-timezone updated_at to UTC (regression: was mis-parsed as local time)', async () => {
    selectMock.mockReturnValue(
      makeSelectChain({
        data: [
          { key: 'minVersionCode', value: '35', updated_at: '2026-09-03T11:50:52.951' }, // no trailing Z
          { key: 'latestVersionCode', value: '36', updated_at: '2026-09-03T11:50:52.951' },
          { key: 'downloadUrl', value: 'https://drive.google.com/x', updated_at: '2026-09-03T11:50:52.951' },
        ],
        error: null,
      })
    )

    const { GET } = await import('@/app/api/admin/app-config/route')
    const res = await GET(new NextRequest('https://x.test/api/admin/app-config'))
    const json = await res.json()

    expect(json.updated_at).toBe('2026-09-03T11:50:52.951Z')
    expect(json.minVersionCode).toBe(35)
    expect(json.latestVersionCode).toBe(36)
  })

  it('leaves an already-UTC updated_at untouched', async () => {
    selectMock.mockReturnValue(
      makeSelectChain({
        data: [{ key: 'minVersionCode', value: '36', updated_at: '2026-09-03T11:50:52.951Z' }],
        error: null,
      })
    )
    const { GET } = await import('@/app/api/admin/app-config/route')
    const res = await GET(new NextRequest('https://x.test/api/admin/app-config'))
    const json = await res.json()
    expect(json.updated_at).toBe('2026-09-03T11:50:52.951Z')
  })
})

describe('PUT /api/admin/app-config', () => {
  beforeEach(() => {
    vi.resetModules()
    selectMock.mockReset()
    upsertMock.mockReset()
    selectMock.mockReturnValue(makeSelectChain({ data: [], error: null }))
    upsertMock.mockResolvedValue({ error: null })
  })

  function putRequest(body: Record<string, unknown>) {
    return new NextRequest('https://x.test/api/admin/app-config', {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  it('rejects a non-integer minVersionCode', async () => {
    const { PUT } = await import('@/app/api/admin/app-config/route')
    const res = await PUT(
      putRequest({ minVersionCode: 1.5, latestVersionCode: 36, downloadUrl: 'https://x.com' })
    )
    expect(res.status).toBe(400)
  })

  it('rejects minVersionCode greater than latestVersionCode', async () => {
    const { PUT } = await import('@/app/api/admin/app-config/route')
    const res = await PUT(
      putRequest({ minVersionCode: 40, latestVersionCode: 36, downloadUrl: 'https://x.com' })
    )
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/cannot be greater/)
  })

  it('rejects a missing downloadUrl', async () => {
    const { PUT } = await import('@/app/api/admin/app-config/route')
    const res = await PUT(putRequest({ minVersionCode: 1, latestVersionCode: 36, downloadUrl: '' }))
    expect(res.status).toBe(400)
  })

  it('rejects a malformed downloadUrl', async () => {
    const { PUT } = await import('@/app/api/admin/app-config/route')
    const res = await PUT(
      putRequest({ minVersionCode: 1, latestVersionCode: 36, downloadUrl: 'not-a-url' })
    )
    expect(res.status).toBe(400)
  })

  it('regression: response returns numbers, not strings, for version codes', async () => {
    // This is the exact bug fixed earlier this session: the PUT handler
    // used to echo back the DB-write string map, which broke the
    // client's `Number(x) !== config.x` force-update comparison.
    const { PUT } = await import('@/app/api/admin/app-config/route')
    const res = await PUT(
      putRequest({ minVersionCode: 36, latestVersionCode: 36, downloadUrl: 'https://drive.google.com/x' })
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(typeof json.minVersionCode).toBe('number')
    expect(typeof json.latestVersionCode).toBe('number')
    expect(json.minVersionCode).toBe(36)
  })

  it('writes all four keys via a single upsert on success', async () => {
    const { PUT } = await import('@/app/api/admin/app-config/route')
    await PUT(
      putRequest({
        minVersionCode: 36,
        latestVersionCode: 36,
        downloadUrl: 'https://drive.google.com/x',
        notes: 'v36',
      })
    )
    expect(upsertMock).toHaveBeenCalledTimes(1)
    const [rows] = upsertMock.mock.calls[0]
    const keys = (rows as { key: string }[]).map((r) => r.key).sort()
    expect(keys).toEqual(['downloadUrl', 'latestVersionCode', 'minVersionCode', 'notes'])
  })
})
