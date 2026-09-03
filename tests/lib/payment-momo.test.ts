import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const ENV_KEYS = ['MOMO_PARTNER_CODE', 'MOMO_ACCESS_KEY', 'MOMO_SECRET_KEY', 'MOMO_ENDPOINT'] as const

function clearMomoEnv() {
  for (const k of ENV_KEYS) delete process.env[k]
}

describe('lib/payment/momo', () => {
  beforeEach(() => {
    vi.resetModules()
    clearMomoEnv()
  })
  afterEach(() => {
    clearMomoEnv()
  })

  it('isMomoConfigured is false when any required env var is missing', async () => {
    const { isMomoConfigured } = await import('@/lib/payment/momo')
    expect(isMomoConfigured()).toBe(false)

    process.env.MOMO_PARTNER_CODE = 'PC'
    process.env.MOMO_ACCESS_KEY = 'AK'
    // MOMO_SECRET_KEY still missing
    vi.resetModules()
    const mod2 = await import('@/lib/payment/momo')
    expect(mod2.isMomoConfigured()).toBe(false)
  })

  it('isMomoConfigured is true once all three keys are set', async () => {
    process.env.MOMO_PARTNER_CODE = 'PC'
    process.env.MOMO_ACCESS_KEY = 'AK'
    process.env.MOMO_SECRET_KEY = 'SK'
    const { isMomoConfigured } = await import('@/lib/payment/momo')
    expect(isMomoConfigured()).toBe(true)
  })

  it('createMomoOrder refuses to call out when not configured', async () => {
    const { createMomoOrder } = await import('@/lib/payment/momo')
    const result = await createMomoOrder({ orderId: '1', amount: 99000, orderInfo: 'test' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/chưa được cấu hình/)
    }
  })

  it('verifyMomoIpnSignature accepts a signature it generated itself and rejects a tampered one', async () => {
    process.env.MOMO_PARTNER_CODE = 'PC'
    process.env.MOMO_ACCESS_KEY = 'AK'
    process.env.MOMO_SECRET_KEY = 'SK'
    const crypto = await import('crypto')
    const { verifyMomoIpnSignature } = await import('@/lib/payment/momo')

    const payload = {
      partnerCode: 'PC',
      orderId: '42',
      requestId: 'req-42',
      amount: 99000,
      orderInfo: 'Nang cap Pro',
      orderType: 'momo_wallet',
      transId: 123456789,
      resultCode: 0,
      message: 'Success',
      payType: 'qr',
      responseTime: 1234567890,
      extraData: '',
      signature: '',
    }

    const rawSignature =
      `accessKey=AK&amount=${payload.amount}&extraData=${payload.extraData}` +
      `&message=${payload.message}&orderId=${payload.orderId}&orderInfo=${payload.orderInfo}` +
      `&orderType=${payload.orderType}&partnerCode=${payload.partnerCode}&payType=${payload.payType}` +
      `&requestId=${payload.requestId}&responseTime=${payload.responseTime}&resultCode=${payload.resultCode}` +
      `&transId=${payload.transId}`
    const validSignature = crypto.createHmac('sha256', 'SK').update(rawSignature).digest('hex')

    expect(verifyMomoIpnSignature({ ...payload, signature: validSignature })).toBe(true)
    expect(verifyMomoIpnSignature({ ...payload, signature: 'deadbeef' })).toBe(false)
    // Tampering the amount after signing must invalidate the signature.
    expect(
      verifyMomoIpnSignature({ ...payload, amount: 1, signature: validSignature })
    ).toBe(false)
  })

  it('verifyMomoIpnSignature returns false when MoMo env vars are unset (fail safe)', async () => {
    const { verifyMomoIpnSignature } = await import('@/lib/payment/momo')
    expect(
      verifyMomoIpnSignature({
        partnerCode: 'PC',
        orderId: '1',
        requestId: 'r',
        amount: 1,
        orderInfo: 'x',
        orderType: 'momo_wallet',
        transId: 1,
        resultCode: 0,
        message: 'ok',
        payType: 'qr',
        responseTime: 1,
        extraData: '',
        signature: 'anything',
      })
    ).toBe(false)
  })
})
