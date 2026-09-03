import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/api-auth', () => ({
  requireAuth: vi.fn(async () => ({
    authenticated: true,
    user: { id: 'user-1' },
    isAdmin: false,
  })),
}))

vi.mock('@/lib/payment/momo', () => ({
  isMomoConfigured: vi.fn(() => false),
  createMomoOrder: vi.fn(async () => ({ ok: true, payUrl: 'https://momo.test/pay', requestId: 'req-1' })),
}))

vi.mock('@/lib/payment/vnpay', () => ({
  isVnpayConfigured: vi.fn(() => false),
  createVnpayOrder: vi.fn(() => ({ ok: true, payUrl: 'https://vnpay.test/pay?vnp_TxnRef=1-1' })),
}))

const insertedRows: Record<string, unknown>[] = []
const updateMock = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn((row: Record<string, unknown>) => {
        insertedRows.push(row)
        return {
          select: () => ({
            single: async () => ({ data: { id: 7, ...row }, error: null }),
          }),
        }
      }),
      update: updateMock,
    })),
  },
}))

function postRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new NextRequest('https://x.test/api/subscriptions/create-order', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  })
}

describe('POST /api/subscriptions/create-order', () => {
  beforeEach(() => {
    vi.resetModules()
    insertedRows.length = 0
    updateMock.mockClear()
  })

  it('rejects an unknown payment method', async () => {
    const { POST } = await import('@/app/api/subscriptions/create-order/route')
    const res = await POST(postRequest({ method: 'stripe' }))
    expect(res.status).toBe(400)
  })

  it('returns 503 for MoMo when the gateway is not configured, without creating an order row', async () => {
    const { POST } = await import('@/app/api/subscriptions/create-order/route')
    const res = await POST(postRequest({ method: 'momo' }))
    const json = await res.json()
    expect(res.status).toBe(503)
    expect(json.error).toMatch(/chưa được kích hoạt/)
    expect(insertedRows).toHaveLength(0)
  })

  it('returns 503 for VNPay when the gateway is not configured, without creating an order row', async () => {
    const { POST } = await import('@/app/api/subscriptions/create-order/route')
    const res = await POST(postRequest({ method: 'vnpay' }))
    expect(res.status).toBe(503)
    expect(insertedRows).toHaveLength(0)
  })

  it('creates a pending order and returns the MoMo payUrl once configured', async () => {
    const momo = await import('@/lib/payment/momo')
    vi.mocked(momo.isMomoConfigured).mockReturnValue(true)

    const { POST } = await import('@/app/api/subscriptions/create-order/route')
    const res = await POST(postRequest({ method: 'momo' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.payUrl).toBe('https://momo.test/pay')
    expect(insertedRows).toHaveLength(1)
    expect(insertedRows[0]).toMatchObject({
      user_id: 'user-1',
      subscription_tier: 'pro',
      payment_method: 'momo',
      payment_status: 'pending',
    })
  })

  it('creates a pending order and returns the VNPay payUrl once configured', async () => {
    const vnpay = await import('@/lib/payment/vnpay')
    vi.mocked(vnpay.isVnpayConfigured).mockReturnValue(true)

    const { POST } = await import('@/app/api/subscriptions/create-order/route')
    const res = await POST(
      postRequest({ method: 'vnpay' }, { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.payUrl).toContain('vnpay.test')
    expect(insertedRows[0]).toMatchObject({ payment_method: 'vnpay', payment_status: 'pending' })
  })

  it('rejects an unauthenticated request before touching the database', async () => {
    vi.doMock('@/lib/api-auth', () => ({
      requireAuth: vi.fn(async () => ({
        authenticated: false,
        error: 'Missing or invalid authorization header',
        status: 401,
      })),
    }))
    const { POST } = await import('@/app/api/subscriptions/create-order/route')
    const res = await POST(postRequest({ method: 'momo' }))
    expect(res.status).toBe(401)
    expect(insertedRows).toHaveLength(0)
  })
})
