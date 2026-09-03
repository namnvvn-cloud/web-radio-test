import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const ENV_KEYS = ['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET', 'VNPAY_ENDPOINT', 'VNPAY_RETURN_URL'] as const

function clearVnpayEnv() {
  for (const k of ENV_KEYS) delete process.env[k]
}

describe('lib/payment/vnpay', () => {
  beforeEach(() => {
    vi.resetModules()
    clearVnpayEnv()
  })
  afterEach(() => {
    clearVnpayEnv()
  })

  it('isVnpayConfigured is false until both TMN code and hash secret are set', async () => {
    const { isVnpayConfigured } = await import('@/lib/payment/vnpay')
    expect(isVnpayConfigured()).toBe(false)

    process.env.VNPAY_TMN_CODE = 'TMN'
    vi.resetModules()
    const mod2 = await import('@/lib/payment/vnpay')
    expect(mod2.isVnpayConfigured()).toBe(false)

    process.env.VNPAY_HASH_SECRET = 'SECRET'
    vi.resetModules()
    const mod3 = await import('@/lib/payment/vnpay')
    expect(mod3.isVnpayConfigured()).toBe(true)
  })

  it('createVnpayOrder refuses to build a payUrl when not configured', async () => {
    const { createVnpayOrder } = await import('@/lib/payment/vnpay')
    const result = createVnpayOrder({ txnRef: '1-123', amount: 99000, orderInfo: 'x', ipAddr: '1.2.3.4' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/chưa được cấu hình/)
  })

  it('createVnpayOrder produces a self-consistent signed payUrl once configured', async () => {
    process.env.VNPAY_TMN_CODE = 'TMN123'
    process.env.VNPAY_HASH_SECRET = 'SuperSecret'
    const { createVnpayOrder, verifyVnpaySignature } = await import('@/lib/payment/vnpay')

    const result = createVnpayOrder({
      txnRef: '99-1234567890',
      amount: 99000,
      orderInfo: 'Nang cap Pro',
      ipAddr: '127.0.0.1',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const url = new URL(result.payUrl)
    const receivedHash = url.searchParams.get('vnp_SecureHash')!
    const params: Record<string, string> = {}
    url.searchParams.forEach((value, key) => {
      if (key !== 'vnp_SecureHash') params[key] = value
    })

    // Amount must be x100 per VNPay spec.
    expect(params.vnp_Amount).toBe('9900000')
    expect(verifyVnpaySignature(params, receivedHash)).toBe(true)
    // Tampering any field must invalidate the hash.
    expect(verifyVnpaySignature({ ...params, vnp_Amount: '1' }, receivedHash)).toBe(false)
  })

  it('verifyVnpaySignature returns false when VNPAY_HASH_SECRET is unset (fail safe)', async () => {
    const { verifyVnpaySignature } = await import('@/lib/payment/vnpay')
    expect(verifyVnpaySignature({ vnp_TxnRef: '1' }, 'anyhash')).toBe(false)
  })
})
