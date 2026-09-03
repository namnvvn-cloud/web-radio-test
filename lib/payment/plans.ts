/**
 * Pro plan pricing — PLACEHOLDER pending a business decision from anh Nam.
 * Not wired to any live payment yet (gateways are inactive scaffolds),
 * so changing this has no real-world billing effect until merchant
 * keys are added and this is confirmed.
 */
export const PRO_PLAN = {
  tier: 'pro' as const,
  amountVnd: 99000,
  billingCycleDays: 30,
  label: 'Gói Pro — 99.000đ / tháng',
}
