import { and, eq } from 'drizzle-orm'
import type { Auth } from '../auth.ts'
import type { Config } from '../config.ts'
import type { Db } from './client.ts'
import { account, device, payment, subscription, user } from './schema.ts'

export const ADMIN_EMAIL = 'admin@laslesvpn.test'
export const DEMO_EMAIL = 'demo@laslesvpn.test'

function monthsAgo(n: number) {
  const date = new Date()
  date.setMonth(date.getMonth() - n)
  return date
}

// Finds the user by email or creates it with a confirmed email, without sending mail.
// A user left without a password by an interrupted run gets one.
async function ensureUser(
  db: Db,
  auth: Auth,
  data: { name: string; email: string; password: string; role: 'admin' | 'customer' },
) {
  const ctx = await auth.$context
  const [found] = await db.select({ id: user.id }).from(user).where(eq(user.email, data.email))
  const id =
    found?.id ??
    (
      await ctx.internalAdapter.createUser(
        { name: data.name, email: data.email, emailVerified: true, role: data.role, locale: 'en' },
        { method: 'admin' },
      )
    ).id
  const [credential] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, id), eq(account.providerId, 'credential')))
  if (!credential) {
    await ctx.internalAdapter.linkAccount({
      userId: id,
      providerId: 'credential',
      accountId: id,
      password: await ctx.password.hash(data.password),
    })
  }
  return { id, changed: !found || !credential }
}

// Safe to run on every start: every step checks for itself, so a run that was
// interrupted halfway is completed by the next one. Returns false when there was nothing to do.
// In production it does nothing unless both passwords were set explicitly
// (config.seed.enabled), so the public default passwords never reach a live database.
export async function seed(db: Db, auth: Auth, passwords: Config['seed']) {
  if (!passwords.enabled) return false
  const admin = await ensureUser(db, auth, {
    name: 'Admin',
    email: ADMIN_EMAIL,
    password: passwords.adminPassword,
    role: 'admin',
  })
  const demo = await ensureUser(db, auth, {
    name: 'Demo Customer',
    email: DEMO_EMAIL,
    password: passwords.demoPassword,
    role: 'customer',
  })
  let changed = admin.changed || demo.changed
  const demoId = demo.id

  const has = async (table: typeof subscription | typeof device | typeof payment) =>
    (await db.select({ id: table.userId }).from(table).where(eq(table.userId, demoId)).limit(1)).length > 0

  if (!(await has(subscription))) {
    const renewsAt = monthsAgo(-1)
    await db.insert(subscription).values({
      userId: demoId,
      plan: 'standard',
      billing: 'monthly',
      status: 'active',
      renewsAt,
      createdAt: monthsAgo(2),
    })
    changed = true
  }
  if (!(await has(device))) {
    await db.insert(device).values([
      { id: 'DEV-SEED-1', userId: demoId, name: 'Work laptop', platform: 'macos', createdAt: monthsAgo(2) },
      { id: 'DEV-SEED-2', userId: demoId, name: 'Phone', platform: 'android', createdAt: monthsAgo(1) },
    ])
    changed = true
  }
  if (!(await has(payment))) {
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
    changed = true
  }
  return changed
}
