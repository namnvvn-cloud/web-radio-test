import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { getPaymentSettings } from '@/lib/payment/plans'
import { getUsdToVndRate, vndToUsd } from '@/lib/payment/fx'
import { isMomoConfigured } from '@/lib/payment/momo'
import { isVnpayConfigured } from '@/lib/payment/vnpay'

/**
 * GET /api/payment-settings — what /user/upgrade needs to render the 5
 * payment tiles: is billing on at all, the monthly price, the bank
 * account to transfer to, and the live USD price for the Visa tile.
 * Auth required (any role) — bank account details don't leak to
 * logged-out requests.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const settings = await getPaymentSettings()
  const fx = await getUsdToVndRate()
  const amountUsd = vndToUsd(settings.monthlyPriceVnd, fx.rate, settings.usdMarkupPercent)

  return NextResponse.json({
    success: true,
    paymentEnabled: settings.paymentEnabled,
    monthlyPriceVnd: settings.monthlyPriceVnd,
    bank: {
      bankName: settings.bankName,
      accountNumber: settings.bankAccountNumber,
      accountName: settings.bankAccountName,
      branch: settings.bankBranch,
    },
    usd: {
      amount: amountUsd,
      rate: fx.rate,
      rateSource: fx.source,
      rateFetchedAt: fx.fetchedAt,
    },
    gateways: {
      momo: isMomoConfigured(),
      vnpay: isVnpayConfigured(),
    },
  })
}
