import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const resetPasswordForEmailMock = vi.fn()

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    auth: { resetPasswordForEmail: resetPasswordForEmailMock },
  },
}))

function postRequest(body: unknown) {
  return new NextRequest('https://x.test/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.resetModules()
    resetPasswordForEmailMock.mockReset().mockResolvedValue({ error: null })
  })

  it('rejects a missing email', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const res = await POST(postRequest({}))
    expect(res.status).toBe(400)
  })

  it('rejects an empty-string email', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const res = await POST(postRequest({ email: '   ' }))
    expect(res.status).toBe(400)
  })

  it('calls resetPasswordForEmail with a reset-password redirect and reports success', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const res = await POST(postRequest({ email: 'user@example.com' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
    expect(resetPasswordForEmailMock).toHaveBeenCalledTimes(1)
    const call = resetPasswordForEmailMock.mock.calls[0] as [string, { redirectTo: string }]
    expect(call[0]).toBe('user@example.com')
    expect(call[1].redirectTo).toMatch(/\/auth\/reset-password$/)
  })

  it('still reports success when Supabase errors, so account existence is never leaked', async () => {
    resetPasswordForEmailMock.mockResolvedValue({ error: { message: 'user not found' } })
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const res = await POST(postRequest({ email: 'unknown@example.com' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
  })

  it('trims whitespace from the email before sending', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    await POST(postRequest({ email: '  user@example.com  ' }))
    const call = resetPasswordForEmailMock.mock.calls[0] as [string, unknown]
    expect(call[0]).toBe('user@example.com')
  })
})
