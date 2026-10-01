import planFree from '../assets/plan-free.svg'
import planStandard from '../assets/plan-standard.svg'
import planPremium from '../assets/plan-premium.svg'

export type PlanId = 'free' | 'standard' | 'premium'

export interface Plan {
  id: PlanId
  name: string
  image: string
  price: number
  perks: string[]
}

export const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free Plan',
    image: planFree,
    price: 0,
    perks: ['Unlimited Bandwitch', 'Encrypted Connection', 'No Traffic Logs', 'Works on All Devices'],
  },
  {
    id: 'standard',
    name: 'Standard Plan',
    image: planStandard,
    price: 9,
    perks: [
      'Unlimited Bandwitch',
      'Encrypted Connection',
      'Yes Traffic Logs',
      'Works on All Devices',
      'Connect Anyware',
    ],
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    image: planPremium,
    price: 12,
    perks: [
      'Unlimited Bandwitch',
      'Encrypted Connection',
      'Yes Traffic Logs',
      'Works on All Devices',
      'Connect Anyware',
      'Get New Features',
    ],
  },
]

export function getPlan(id: string | null | undefined): Plan | undefined {
  return plans.find((plan) => plan.id === id)
}
