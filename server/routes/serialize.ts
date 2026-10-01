import type { Device, Payment, Preferences, Profile, Role, Subscription } from '../../shared/api.ts'
import type { device, payment, preferences, subscription } from '../db/schema.ts'
import type { SessionUser } from '../middleware.ts'

type SubscriptionRow = typeof subscription.$inferSelect

export const defaultPreferences: Preferences = { autoConnect: false, killSwitch: true, newsletter: false }

// A cancelled plan stays in force until the paid period ends, then the
// account is on the free plan.
export function toSubscription(row: SubscriptionRow, now = new Date()): Subscription {
  const lapsed = row.status === 'canceled' && row.renewsAt !== null && row.renewsAt <= now
  return {
    plan: lapsed ? 'free' : row.plan,
    billing: lapsed ? null : row.billing,
    status: row.status,
    renewsAt: lapsed ? null : (row.renewsAt?.toISOString() ?? null),
    createdAt: row.createdAt.toISOString(),
  }
}

export function toProfile(user: SessionUser): Profile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    locale: user.locale === 'ru' ? 'ru' : 'en',
    role: (user.role ?? 'customer') as Role,
    // Typed only once the twoFactor plugin is on (Task 13); false until then.
    twoFactorEnabled: (user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled === true,
    createdAt: new Date(user.createdAt).toISOString(),
  }
}

export function toDevice(row: typeof device.$inferSelect): Device {
  return { id: row.id, name: row.name, platform: row.platform, createdAt: row.createdAt.toISOString() }
}

export function toPayment(row: typeof payment.$inferSelect): Payment {
  return {
    id: row.id,
    plan: row.plan,
    billing: row.billing,
    amount: row.amount,
    cardBrand: row.cardBrand,
    cardLast4: row.cardLast4,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }
}

export function toPreferences(row: typeof preferences.$inferSelect | undefined): Preferences {
  return row
    ? { autoConnect: row.autoConnect, killSwitch: row.killSwitch, newsletter: row.newsletter }
    : defaultPreferences
}
