// Plan facts shared by the site and the API server. Images live in
// src/data/plans.ts because the server has no use for them.
export const planIds = ['free', 'standard', 'premium'] as const
export type PlanId = (typeof planIds)[number]

export const billings = ['monthly', 'yearly'] as const
export type Billing = (typeof billings)[number]

export interface PlanInfo {
  id: PlanId
  // US dollars per month.
  price: number
  devices: number
}

export const planInfo: PlanInfo[] = [
  { id: 'free', price: 0, devices: 1 },
  { id: 'standard', price: 9, devices: 3 },
  { id: 'premium', price: 12, devices: 6 },
]

// Yearly billing: pay for 10 months, get 12.
export const YEARLY_MONTHS = 10

export function getPlanInfo(id: string | null | undefined): PlanInfo | undefined {
  return planInfo.find((plan) => plan.id === id)
}

// What one order costs, in cents. The server charges this; the page only shows it.
export function priceCents(plan: PlanId, billing: Billing): number {
  const info = getPlanInfo(plan)
  if (!info) throw new Error(`Unknown plan: ${plan}`)
  return info.price * 100 * (billing === 'yearly' ? YEARLY_MONTHS : 1)
}

// Accounts without a subscription get the free allowance.
export function deviceLimit(plan: PlanId | null | undefined): number {
  return getPlanInfo(plan)?.devices ?? 1
}
