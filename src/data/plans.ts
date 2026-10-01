import { getPlanInfo, planInfo, type PlanInfo } from '../../shared/plans'
import planFree from '../assets/plan-free.svg'
import planStandard from '../assets/plan-standard.svg'
import planPremium from '../assets/plan-premium.svg'

export type { Billing, PlanId } from '../../shared/plans'

// Prices and device limits live in shared/plans.ts (the API charges from
// them); the site only adds the pictures.
export interface Plan extends PlanInfo {
  image: string
}

const images: Record<PlanInfo['id'], string> = { free: planFree, standard: planStandard, premium: planPremium }

export const plans: Plan[] = planInfo.map((plan) => ({ ...plan, image: images[plan.id] }))

export function getPlan(id: string | null | undefined): Plan | undefined {
  const info = getPlanInfo(id)
  return info && plans.find((plan) => plan.id === info.id)
}
