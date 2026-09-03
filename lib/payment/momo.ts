import crypto from 'crypto'

/**
 * MoMo "Payment via Method AIO" (captureWallet) integration — scaffold only.
 *
 * INACTIVE until these Vercel env vars are set (all optional; if any is
 * missing, isMomoConfigured() is false and callers must refuse to create
 * an order rather than calling MoMo with empty/garbage credentials):
 *   MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY
 *   MOMO_ENDPOINT      (optional — defaults to the MoMo sandbox below)
 *   MOMO_REDIRECT_URL  (optional — defaults to NEXT_PUBLIC_SITE_URL + /user/upgrade/result)
 *   MOMO_IPN_URL       (optional — defaults to NEXT_PUBLIC_SITE_URL + /api/subscriptions/momo/ipn)
 *
 * Reference: https://developers.momo.vn/v3/docs/payment/api/wallet/onetime
 * Never hardcode partnerCode/accessKey/secretKey — this repo is PUBLIC.
 */

const DEFAULT_ENDPOINT = 'https://test-payment.momo.vn/v2/gateway/api/create'

export function isMomoConfigured(): boolean {
  return Boolean(
    process.env.MOMO_PARTNER_CODE &&
      process.env.MOMO_ACCESS_KEY &&
      process.env.MOMO_SECRET_KEY
  )
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://web-radio-test.vercel.app'
}

/** HMAC-SHA256 signature per MoMo's documented raw-signature format. */
function sign(rawSignature: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')
}

export type MomoCreateOrderResult =
  | { ok: true; payUrl: string; requestId: string }
  | { ok: false; error: string }

/**
 * Create a MoMo payment request and return the payUrl to redirect the
 * user to. orderId must be unique per attempt (we use the subscriptions
 * row id + timestamp).
 */
export async function createMomoOrder(params: {
  orderId: string
  amount: number // VND, integer
  orderInfo: string
}): Promise<MomoCreateOrderResult> {
  if (!isMomoConfigured()) {
    return { ok: false, error: 'MoMo chưa được cấu hình (thiếu MOMO_PARTNER_CODE/MOMO_ACCESS_KEY/MOMO_SECRET_KEY)' }
  }

  const partnerCode = process.env.MOMO_PARTNER_CODE!
  const accessKey = process.env.MOMO_ACCESS_KEY!
  const secretKey = process.env.MOMO_SECRET_KEY!
  const endpoint = process.env.MOMO_ENDPOINT || DEFAULT_ENDPOINT
  const redirectUrl = process.env.MOMO_REDIRECT_URL || `${siteUrl()}/user/upgrade/result`
  const ipnUrl = process.env.MOMO_IPN_URL || `${siteUrl()}/api/subscriptions/momo/ipn`

  const requestId = `${params.orderId}-${Date.now()}`
  const requestType = 'captureWallet'
  const extraData = ''

  // MoMo requires this EXACT key order in the raw signature string.
  const rawSignature =
    `accessKey=${accessKey}&amount=${params.amount}&extraData=${extraData}` +
    `&ipnUrl=${ipnUrl}&orderId=${params.orderId}&orderInfo=${params.orderInfo}` +
    `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}` +
    `&requestType=${requestType}`

  const signature = sign(rawSignature, secretKey)

  const body = {
    partnerCode,
    accessKey,
    requestId,
    amount: String(params.amount),
    orderId: params.orderId,
    orderInfo: params.orderInfo,
    redirectUrl,
    ipnUrl,
    extraData,
    requestType,
    signature,
    lang: 'vi',
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (json.resultCode === 0 && json.payUrl) {
      return { ok: true, payUrl: json.payUrl, requestId }
    }
    return { ok: false, error: json.message || `MoMo trả lỗi resultCode=${json.resultCode}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'MoMo request failed' }
  }
}

export type MomoIpnPayload = {
  partnerCode: string
  orderId: string
  requestId: string
  amount: number
  orderInfo: string
  orderType: string
  transId: number | string
  resultCode: number
  message: string
  payType: string
  responseTime: number
  extraData: string
  signature: string
}

/** Verify the signature MoMo sends on the IPN callback. */
export function verifyMomoIpnSignature(payload: MomoIpnPayload): boolean {
  const secretKey = process.env.MOMO_SECRET_KEY
  const accessKey = process.env.MOMO_ACCESS_KEY
  if (!secretKey || !accessKey) return false

  const rawSignature =
    `accessKey=${accessKey}&amount=${payload.amount}&extraData=${payload.extraData}` +
    `&message=${payload.message}&orderId=${payload.orderId}&orderInfo=${payload.orderInfo}` +
    `&orderType=${payload.orderType}&partnerCode=${payload.partnerCode}&payType=${payload.payType}` +
    `&requestId=${payload.requestId}&responseTime=${payload.responseTime}&resultCode=${payload.resultCode}` +
    `&transId=${payload.transId}`

  const expected = sign(rawSignature, secretKey)
  return expected === payload.signature
}
