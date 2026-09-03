import crypto from 'crypto'

/**
 * VNPay integration — scaffold only.
 *
 * INACTIVE until these Vercel env vars are set (all optional; if any is
 * missing, isVnpayConfigured() is false and callers must refuse to
 * create an order rather than signing with an empty secret):
 *   VNPAY_TMN_CODE, VNPAY_HASH_SECRET
 *   VNPAY_ENDPOINT     (optional — defaults to the VNPay sandbox below)
 *   VNPAY_RETURN_URL   (optional — defaults to NEXT_PUBLIC_SITE_URL + /user/upgrade/result)
 *
 * Reference: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 * Never hardcode vnp_TmnCode/HashSecret — this repo is PUBLIC.
 */

const DEFAULT_ENDPOINT = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'

export function isVnpayConfigured(): boolean {
  return Boolean(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET)
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://web-radio-test.vercel.app'
}

/** VNPay requires params sorted by key, URL-encoded, joined with & and =. */
function sortedQueryString(params: Record<string, string>): string {
  const keys = Object.keys(params).sort()
  return keys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')
}

function vnpDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  )
}

export type VnpayCreateOrderResult = { ok: true; payUrl: string } | { ok: false; error: string }

/**
 * Build the VNPay payment URL to redirect the user to. txnRef must be
 * unique per attempt (we use the subscriptions row id + timestamp).
 */
export function createVnpayOrder(params: {
  txnRef: string
  amount: number // VND, integer (will be x100 per VNPay spec)
  orderInfo: string
  ipAddr: string
}): VnpayCreateOrderResult {
  if (!isVnpayConfigured()) {
    return { ok: false, error: 'VNPay chưa được cấu hình (thiếu VNPAY_TMN_CODE/VNPAY_HASH_SECRET)' }
  }

  const tmnCode = process.env.VNPAY_TMN_CODE!
  const hashSecret = process.env.VNPAY_HASH_SECRET!
  const endpoint = process.env.VNPAY_ENDPOINT || DEFAULT_ENDPOINT
  const returnUrl = process.env.VNPAY_RETURN_URL || `${siteUrl()}/user/upgrade/result`

  const now = new Date()
  const expire = new Date(now.getTime() + 15 * 60 * 1000)

  const fields: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: String(params.amount * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: params.txnRef,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: params.ipAddr,
    vnp_CreateDate: vnpDate(now),
    vnp_ExpireDate: vnpDate(expire),
  }

  const signData = sortedQueryString(fields)
  const secureHash = crypto.createHmac('sha512', hashSecret).update(signData).digest('hex')

  const payUrl = `${endpoint}?${signData}&vnp_SecureHash=${secureHash}`
  return { ok: true, payUrl }
}

/**
 * Verify the vnp_SecureHash on a VNPay return/IPN request. queryParams
 * must NOT include vnp_SecureHash / vnp_SecureHashType (strip before
 * calling — pass everything else exactly as received).
 */
export function verifyVnpaySignature(
  queryParams: Record<string, string>,
  receivedHash: string
): boolean {
  const hashSecret = process.env.VNPAY_HASH_SECRET
  if (!hashSecret) return false

  const signData = sortedQueryString(queryParams)
  const expected = crypto.createHmac('sha512', hashSecret).update(signData).digest('hex')
  return expected.toLowerCase() === receivedHash.toLowerCase()
}
