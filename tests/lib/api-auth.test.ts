import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const getUserMock = vi.fn()
const singleMock = vi.fn()
const insertMock = vi.fn(async () => ({ error: null }))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    auth: { getUser: getUserMock },
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ single: singleMock }) }),
      insert: insertMock,
    })),
  },
}))

function requestWithAuth(header?: string) {
  return new NextRequest('https://x.test/api/whatever', {
    headers: header ? { authorization: header } : {},
  })
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.resetModules()
    getUserMock.mockReset()
    singleMock.mockReset()
  })

  it('rejects a request with no Authorization header', async () => {
    const { requireAuth } = await import('@/lib/api-auth')
    const result = await requireAuth(requestWithAuth())
    expect(result.authenticated).toBe(false)
    if (!result.authenticated) expect(result.status).toBe(401)
  })

  it('rejects a header that is not a Bearer token', async () => {
    const { requireAuth } = await import('@/lib/api-auth')
    const result = await requireAuth(requestWithAuth('Basic abc123'))
    expect(result.authenticated).toBe(false)
  })

  it('rejects an invalid/expired token', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } })
    const { requireAuth } = await import('@/lib/api-auth')
    const result = await requireAuth(requestWithAuth('Bearer bad-token'))
    expect(result.authenticated).toBe(false)
    if (!result.authenticated) expect(result.status).toBe(401)
  })

  it('resolves an authenticated non-admin user correctly', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    singleMock.mockResolvedValue({ data: { role: 'user' } })
    const { requireAuth } = await import('@/lib/api-auth')
    const result = await requireAuth(requestWithAuth('Bearer good-token'))
    expect(result.authenticated).toBe(true)
    if (result.authenticated) {
      expect(result.isAdmin).toBe(false)
      expect(result.user.id).toBe('u1')
    }
  })

  it('resolves isAdmin=true only when the profile role is exactly "admin"', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null })
    singleMock.mockResolvedValue({ data: { role: 'admin' } })
    const { requireAuth } = await import('@/lib/api-auth')
    const result = await requireAuth(requestWithAuth('Bearer good-token'))
    expect(result.authenticated).toBe(true)
    if (result.authenticated) expect(result.isAdmin).toBe(true)
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.resetModules()
    getUserMock.mockReset()
    singleMock.mockReset()
  })

  it('rejects an authenticated but non-admin user with 403', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    singleMock.mockResolvedValue({ data: { role: 'user' } })
    const { requireAdmin } = await import('@/lib/api-auth')
    const result = await requireAdmin(requestWithAuth('Bearer good-token'))
    expect(result.authenticated).toBe(false)
    if (!result.authenticated) expect(result.status).toBe(403)
  })

  it('passes through an unauthenticated result unchanged (propagates the 401, not a 403)', async () => {
    const { requireAdmin } = await import('@/lib/api-auth')
    const result = await requireAdmin(requestWithAuth())
    expect(result.authenticated).toBe(false)
    if (!result.authenticated) expect(result.status).toBe(401)
  })

  it('allows an admin user through', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
    singleMock.mockResolvedValue({ data: { role: 'admin' } })
    const { requireAdmin } = await import('@/lib/api-auth')
    const result = await requireAdmin(requestWithAuth('Bearer good-token'))
    expect(result.authenticated).toBe(true)
  })
})

describe('logAudit', () => {
  beforeEach(() => {
    vi.resetModules()
    insertMock.mockReset().mockResolvedValue({ error: null })
  })

  it('never throws even when the insert fails', async () => {
    insertMock.mockRejectedValue(new Error('DB down'))
    const { logAudit } = await import('@/lib/api-auth')
    await expect(logAudit('admin-1', 'test_action', 'some_table', 'id1')).resolves.toBeUndefined()
  })
})
