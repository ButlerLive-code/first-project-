import type { Billing, PlanId } from '../../shared/plans'

export interface CardInput {
  name: string
  number: string
  expiry: string
  cvc: string
}

// The order the page sends. It never carries a price: the server decides
// what to charge. A free plan sends no card at all.
export function checkoutBody(plan: PlanId, billing: Billing, card: CardInput) {
  return plan === 'free' ? { plan } : { plan, billing, card }
}
