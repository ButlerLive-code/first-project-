import { randomBytes } from 'node:crypto'
import { Hono } from 'hono'
import * as z from 'zod'
import type { CheckoutResult } from '../../shared/api.ts'
import { cardBrand, isExpiryValid } from '../../shared/card.ts'
import { billings, planIds, priceCents, type Billing } from '../../shared/plans.ts'
import type { Auth } from '../auth.ts'
import type { Db } from '../db/client.ts'
import { payment, subscription } from '../db/schema.ts'
import { AppError, readBody } from '../errors.ts'
import { requireUser, type AppEnv } from '../middleware.ts'
import { toPayment, toSubscription } from './serialize.ts'

// The test card that always fails, like Stripe's 4000 0000 0000 0002.
export const DECLINED_CARD = '4000000000000002'

const card = z.object({
  number: z
    .string()
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{16}$/)),
  expiry: z.string().refine(isExpiryValid),
  cvc: z.string().regex(/^\d{3,4}$/),
  name: z.string().trim().min(1).max(80),
})

// Any extra field (a forged "amount" or "price") is dropped by zod.
const order = z.discriminatedUnion('plan', [
  z.object({ plan: z.literal('free') }),
  z.object({ plan: z.enum(planIds).exclude(['free']), billing: z.enum(billings), card }),
])

function renewal(from: Date, billing: Billing) {
  const date = new Date(from)
  if (billing === 'yearly') date.setFullYear(date.getFullYear() + 1)
  else date.setMonth(date.getMonth() + 1)
  return date
}

function invoiceId() {
  return `INV-${randomBytes(5).toString('hex').toUpperCase()}`
}

export function checkoutRoutes({ db, auth }: { db: Db; auth: Auth }) {
  return new Hono<AppEnv>().use(requireUser(auth)).post('/', async (c) => {
    const user = c.get('user')
    if (!user.emailVerified) throw new AppError('email_not_verified', 403)
    const body = await readBody(c, order)
    const now = new Date()

    if (body.plan === 'free') {
      const values = { plan: 'free' as const, billing: null, status: 'active' as const, renewsAt: null }
      const [row] = await db
        .insert(subscription)
        .values({ userId: user.id, ...values })
        .onConflictDoUpdate({ target: subscription.userId, set: values })
        .returning()
      const result: CheckoutResult = { subscription: toSubscription(row), payment: null }
      return c.json(result)
    }

    if (body.card.number === DECLINED_CARD) throw new AppError('card_declined', 402)

    const values = { plan: body.plan, billing: body.billing, status: 'active' as const, renewsAt: renewal(now, body.billing) }
    const { sub, paid } = await db.transaction(async (tx) => {
      const [paid] = await tx
        .insert(payment)
        .values({
          id: invoiceId(),
          userId: user.id,
          plan: body.plan,
          billing: body.billing,
          amount: priceCents(body.plan, body.billing),
          // Only the brand and the last four digits are kept.
          cardBrand: cardBrand(body.card.number),
          cardLast4: body.card.number.slice(-4),
          createdAt: now,
        })
        .returning()
      const [sub] = await tx
        .insert(subscription)
        .values({ userId: user.id, ...values })
        .onConflictDoUpdate({ target: subscription.userId, set: values })
        .returning()
      return { sub, paid }
    })
    const result: CheckoutResult = { subscription: toSubscription(sub), payment: toPayment(paid) }
    return c.json(result)
  })
}
