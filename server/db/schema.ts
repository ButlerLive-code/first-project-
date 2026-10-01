// Database schema. The first five tables belong to Better Auth (core,
// twoFactor and admin plugins, plus our `locale` field); Better Auth checks
// them against its own expectations at startup and logs "Drizzle schema
// mismatch" if they drift. The rest are LaslesVPN's own tables.
// After changing this file run `npm run db:generate` and commit the new migration.
import { boolean, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  role: text('role', { enum: ['customer', 'admin', 'support', 'finance'] })
    .default('customer')
    .notNull(),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  locale: text('locale', { enum: ['en', 'ru'] })
    .default('en')
    .notNull(),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: text('impersonated_by'),
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export const twoFactor = pgTable(
  'two_factor',
  {
    id: text('id').primaryKey(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    verified: boolean('verified').default(true),
    failedVerificationCount: integer('failed_verification_count').default(0),
    lockedUntil: timestamp('locked_until'),
  },
  (table) => [index('two_factor_secret_idx').on(table.secret), index('two_factor_user_id_idx').on(table.userId)],
)

// One row per user; a missing row means the user has never chosen a plan.
export const subscription = pgTable('subscription', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  plan: text('plan', { enum: ['free', 'standard', 'premium'] }).notNull(),
  billing: text('billing', { enum: ['monthly', 'yearly'] }),
  status: text('status', { enum: ['active', 'canceled'] })
    .default('active')
    .notNull(),
  renewsAt: timestamp('renews_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const payment = pgTable(
  'payment',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    plan: text('plan', { enum: ['free', 'standard', 'premium'] }).notNull(),
    billing: text('billing', { enum: ['monthly', 'yearly'] }).notNull(),
    // Cents.
    amount: integer('amount').notNull(),
    cardBrand: text('card_brand').notNull(),
    cardLast4: text('card_last4').notNull(),
    status: text('status', { enum: ['succeeded'] })
      .default('succeeded')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('payment_user_id_idx').on(table.userId)],
)

export const device = pgTable(
  'device',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    platform: text('platform', { enum: ['windows', 'macos', 'ios', 'android', 'linux'] }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('device_user_id_idx').on(table.userId)],
)

export const preferences = pgTable('preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  autoConnect: boolean('auto_connect').default(false).notNull(),
  killSwitch: boolean('kill_switch').default(true).notNull(),
  newsletter: boolean('newsletter').default(false).notNull(),
})

// Outgoing mail captured in development and shown at /dev/mail. The id
// grows with every message, so it also gives a reliable newest-first order.
export const devMail = pgTable('dev_mail', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  to: text('to').notNull(),
  subject: text('subject').notNull(),
  text: text('text').notNull(),
  html: text('html').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
