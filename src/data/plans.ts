import planFree from '../assets/plan-free.svg'
import planStandard from '../assets/plan-standard.svg'
import planPremium from '../assets/plan-premium.svg'

export type PlanId = 'free' | 'standard' | 'premium'

export interface Plan {
  id: PlanId
  image: string
  price: number
  devices: number
}

export const plans: Plan[] = [
  {
    id: 'free',
    image: planFree,
    price: 0,
    devices: 1,
  },
  {
    id: 'standard',
    image: planStandard,
    price: 9,
    devices: 3,
  },
  {
    id: 'premium',
    image: planPremium,
    price: 12,
    devices: 6,
  },
]

export function getPlan(id: string | null | undefined): Plan | undefined {
  return plans.find((plan) => plan.id === id)
}
