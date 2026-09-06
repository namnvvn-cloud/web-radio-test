/**
 * USD/VND exchange rate for the "Visa" payment tile (thanh toán bằng
 * Visa quy đổi theo USD — theo yêu cầu anh Nam 06/09/2026: lấy tỷ giá
 * real-time từ API công khai, không để admin tự gõ tay).
 *
 * open.er-api.com là API tỷ giá miễn phí, không cần key, cập nhật mỗi
 * ~24h. Nếu API lỗi hoặc mất mạng, dùng rateFallback (được cache lần gọi
 * thành công gần nhất trong bộ nhớ tiến trình) để trang không vỡ.
 */

const FX_ENDPOINT = 'https://open.er-api.com/v6/latest/USD'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 giờ

let cached: { rate: number; fetchedAt: number } | null = null

export type FxResult = { rate: number; source: 'live' | 'cache' | 'fallback'; fetchedAt: string | null }

// Tỷ giá dự phòng khi chưa gọi API lần nào và API cũng đang lỗi — chỉ để
// trang không crash, KHÔNG dùng để tính tiền thật (luôn ưu tiên rate live).
const HARD_FALLBACK_RATE = 26000

export async function getUsdToVndRate(): Promise<FxResult> {
  const now = Date.now()
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return { rate: cached.rate, source: 'cache', fetchedAt: new Date(cached.fetchedAt).toISOString() }
  }

  try {
    const res = await fetch(FX_ENDPOINT, { next: { revalidate: 3600 } })
    const json = await res.json()
    const rate = json?.rates?.VND
    if (typeof rate === 'number' && rate > 0) {
      cached = { rate, fetchedAt: now }
      return { rate, source: 'live', fetchedAt: new Date(now).toISOString() }
    }
    throw new Error('Missing VND rate in FX response')
  } catch (err) {
    console.error('getUsdToVndRate failed:', err)
    if (cached) {
      return { rate: cached.rate, source: 'cache', fetchedAt: new Date(cached.fetchedAt).toISOString() }
    }
    return { rate: HARD_FALLBACK_RATE, source: 'fallback', fetchedAt: null }
  }
}

/** VND -> USD, làm tròn 2 chữ số thập phân, cộng thêm markup % nếu có. */
export function vndToUsd(amountVnd: number, rate: number, markupPercent = 0): number {
  const usd = amountVnd / rate
  return Math.round(usd * (1 + markupPercent / 100) * 100) / 100
}
