import { eq } from 'drizzle-orm'
import type { Auth } from '../auth.ts'
import type { Config } from '../config.ts'
import type { Db } from './client.ts'
import { device, payment, subscription, user } from './schema.ts'

export const ADMIN_EMAIL = 'admin@laslesvpn.test'
export const DEMO_EMAIL = 'demo@laslesvpn.test'

function monthsAgo(n: number) {
  const date = new Date()
  date.setMonth(date.getMonth() - n)
  return date
}

// Creates a user with a confirmed email and a password, without sending mail.
async function createUser(auth: Auth, data: { name: string; email: string; password: string; role: 'admin' | 'customer' }) {
  const ctx = await auth.$context
  const created = await ctx.internalAdapter.createUser(
    { name: data.name, email: data.email, emailVerified: true, role: data.role, locale: 'en' },
    { method: 'admin' },
  )
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: 'credential',
    accountId: created.id,
    password: await ctx.password.hash(data.password),
  })
  return created.id
}

// Safe to run on every start: it does nothing once the admin exists.
// In production it also does nothing unless both passwords were set explicitly
// (config.seed.enabled), so the public default passwords never reach a live database.
export async function seed(db: Db, auth: Auth, passwords: Config['seed']) {
  if (!passwords.enabled) return false
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, ADMIN_EMAIL))
  if (existing) return false

  await createUser(auth, { name: 'Admin', email: ADMIN_EMAIL, password: passwords.adminPassword, role: 'admin' })
  const demoId = await createUser(auth, {
    name: 'Demo Customer',
    email: DEMO_EMAIL,
    password: passwords.demoPassword,
    role: 'customer',
  })

  const lastPaid = monthsAgo(0)
  const renewsAt = new Date(lastPaid)
  renewsAt.setMonth(renewsAt.getMonth() + 1)
  await db.insert(subscription).values({
    userId: demoId,
    plan: 'standard',
    billing: 'monthly',
    status: 'active',
    renewsAt,
    createdAt: monthsAgo(2),
  })
  await db.insert(device).values([
    { id: 'DEV-SEED-1', userId: demoId, name: 'Work laptop', platform: 'macos', createdAt: monthsAgo(2) },
    { id: 'DEV-SEED-2', userId: demoId, name: 'Phone', platform: 'android', createdAt: monthsAgo(1) },
  ])
  await db.insert(payment).values(
    [2, 1, 0].map((n) => ({
      id: `INV-SEED00000${n}`,
      userId: demoId,
      plan: 'standard' as const,
      billing: 'monthly' as const,
      amount: 900,
      cardBrand: 'Visa',
      cardLast4: '4242',
      createdAt: monthsAgo(n),
    })),
  )
  return true
}
