# LaslesVPN: сервер, база и вход — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить демо-вход в `localStorage` настоящим сервером: API на Hono с базой PGlite, регистрация с подтверждением email, вход, сброс и смена пароля, смена email, удаление аккаунта, 2FA, вход через Google и личный кабинет с оформлением заказа через API, на `/` и `/ru`.

**Architecture:** Один `package.json`, два процесса в разработке: Vite (сайт) и Node 25, который запускает `server/index.ts` напрямую (type stripping). Vite проксирует `/api/*`, поэтому браузер видит один адрес, и cookie сессии работают без CORS. Авторизацией занимается Better Auth (`/api/auth/*`, Drizzle-адаптер, плагины `admin` и `twoFactor`). Свои эндпоинты (`/api/me/*`, `/api/checkout`, `/api/config`, `/api/dev/mail`) написаны на Hono с zod, все ошибки приходят как `{ error: { code } }`. Тарифы и типы ответов лежат в `shared/`, их импортируют и сайт, и сервер.

**Tech Stack:** React 19, react-router 8, Vite 8, TypeScript 6, Vitest 5, Node 25 (type stripping, `node --watch`), Hono 4.13 + @hono/node-server 2.1, Better Auth 1.7.7, Drizzle ORM 0.45 + drizzle-kit 0.31, PGlite 0.5, zod 4, nodemailer 10, qrcode 1.5.

**Spec:** `docs/superpowers/specs/2026-10-01-auth-server-design.md`

План написан против коммита `85e0a75` ветки `feature/i18n-ru`. Код плана проверен: инструкции плана (создать, заменить, найти и заменить, команды) были механически применены к чистой копии репозитория задача за задачей, и после каждой задачи проходили `npm run lint`, `npm test`, `npm run build` и `npm run i18n:scan`. Не проверены только шаги в браузере (ручные проверки) и настоящий вход через Google.

## Отклонения от spec

Решения контролёра нужны по этим пунктам. Всё остальное в плане следует spec буквально.

1. **`DATABASE_URL` пока не подключается.** Для внешнего Postgres нужен драйвер (`pg` или `postgres`), которого нет в списке зависимостей, а проверить его локально без Docker нечем. Сервер работает только на PGlite. Если `DATABASE_URL` задан, `loadConfig` падает с понятной ошибкой, а не тихо игнорирует переменную. Подключить драйвер — это около 15 строк в `server/db/client.ts`, их стоит сделать вместе с деплоем.
2. **Просроченная ссылка сброса пароля даёт `token_invalid`, а не `token_expired`.** Better Auth хранит токен сброса в таблице `verification` и на просроченный и на использованный токен отвечает одинаково (`INVALID_TOKEN`). Ссылка подтверждения email (это JWT) различает оба случая, и страница `/verify-email` показывает «ссылка истекла» отдельно, как требует spec.
3. **В «Оплате» нет редактирования карты.** Spec запрещает хранить карту: сервер хранит только бренд и last4 каждого платежа. Блок «Способ оплаты» показывает карту последнего платежа и поясняет, что карта вводится при оформлении заказа. Ключи словаря для редактирования карты удаляются.
4. **«Выйти на всех устройствах» выходит и на текущем.** Вызывается `revoke-sessions`, затем переход на `/login`. Spec не уточняет, остаётся ли текущий сеанс.
5. **Ссылка сброса пароля несёт email:** `/reset-password?token=…&email=…`. Без этого страница не знает, какой email подставить на входе (spec: «переход на вход с подставленным email»), потому что `reset-password` в Better Auth email не возвращает.
6. **Новые аккаунты начинают без устройств.** Демо сейчас само добавляет «это устройство» с бейджем. Сервер ничего не знает о браузере пользователя, поэтому устройства появляются только когда их добавляют. Бейдж «Это устройство» теперь отмечает текущий сеанс в «Активных сеансах».
7. **Ссылка подтверждения email живёт 24 часа.** Spec срок не задаёт, у Better Auth по умолчанию 1 час. Для письма о регистрации это слишком мало. Ссылка сброса живёт 1 час, как в spec.

## Решения, которые стоит знать

- **Запуск TypeScript.** Node 25 исполняет `.ts` сам (type stripping включён по умолчанию), поэтому сервер запускается как `node --watch server/index.ts`, без `tsx`. Условия: только «стираемый» синтаксис (`erasableSyntaxOnly` уже включён в репо, поэтому никаких `enum`, `namespace` и parameter properties), `import type` для типов (`verbatimModuleSyntax`) и явное расширение `.ts` во всех относительных импортах внутри `server/` и `shared/` (Node не ищет файлы без расширения). `allowImportingTsExtensions` уже включён во всех tsconfig, а с `noEmit` расширения переписывать не нужно. Сайт (`src/`) импортирует `shared/` как раньше, без расширений: это bundler-резолвинг Vite.
- **Два процесса одной командой.** `scripts/dev.mjs` (около 40 строк, без зависимостей) запускает API и Vite, пробрасывает вывод и гасит оба процесса, если упал один или нажали Ctrl+C. Он же читает `.env` (`process.loadEnvFile`) и запускает Vite строго на порту из `APP_URL` (`--strictPort`): если порт занят, Vite падает явно, а не уходит на соседний порт, где сломались бы проверка Origin и ссылки в письмах. `concurrently` не нужен.
- **Схема Better Auth написана в `server/db/schema.ts` руками.** За основу взят вывод `npx auth@1.7.7 generate` (CLI Better Auth 1.7 теперь пакет `auth`; `@better-auth/cli` застрял на 1.4) для `admin`, `twoFactor` и поля `locale`, с именами колонок в snake_case. Drizzle-адаптер Better Auth при старте сверяет схему и пишет `Drizzle schema mismatch`, если она разошлась. Миграции генерирует `drizzle-kit generate`, применяет `migrate()` из `drizzle-orm/pglite/migrator` при каждом старте.
- **Ошибки Better Auth переписываются на сервере.** Обработчик `/api/auth/*` пропускает успешные ответы как есть, а в ошибках заменяет тело на `{ error: { code } }` (`server/auth-errors.ts`), сохраняя заголовки и cookie. Английские `message` Better Auth до браузера не доходят. Клиент Better Auth кладёт это тело в `error`, а `authCall()` превращает его в тот же `ApiError`, что и `apiFetch`.
- **Rate limit** включён в разработке и продакшене (Better Auth по умолчанию включает его только в продакшене). IP берётся из `X-Forwarded-For`, который добавляет прокси Vite (`xfwd: true`). В тестах лимит выключен, кроме одного теста, который его и проверяет. При деплое за обратным прокси он тоже должен ставить этот заголовок.
- **Проверки Origin** две: наша `checkOrigin` для всех изменяющих запросов `/api/*` и встроенная проверка Better Auth (она же проверяет `callbackURL`). Better Auth по умолчанию выключает свою проверку под тестами, поэтому в конфиге стоит `disableOriginCheck: false`, и тесты видят то же, что браузер.
- **`user.locale`** — дополнительное поле Better Auth (`additionalFields`, `input: true`). Регистрация передаёт язык страницы, хук `databaseHooks.user.create.before` сводит любое другое значение к `en`. Пока пользователь вошёл, `useSyncUserLocale` (в `Layout`) выравнивает `user.locale` по языку открытой страницы через `PATCH /api/me`. Письма берут язык из `user.locale`.
- **Подписка:** у пользователя нет строки `subscription`, пока он не выбрал тариф. Отмена ставит `status: 'canceled'`, тариф действует до `renewsAt`, после этого `/api/me` отдаёт `plan: 'free'`. Это вычисляется при чтении, фоновых задач нет.
- **Удаление аккаунта требует пароль на сервере**, а не только в форме: хук `hooks.before` Better Auth отвечает `validation_failed` на `/delete-user` без пароля. Без хука Better Auth удаляет аккаунт по «свежей» сессии без пароля.
- **Продакшен без SMTP** пишет письма в `dev_mail` и в консоль, но `/dev/mail` и `/api/dev/mail` в продакшене выключены. Раздача `build/` тем же процессом — «на будущее» по spec и в этот план не входит.

## Global Constraints

- Node.js 25. Сервер запускается через `node` напрямую, без сборки, `tsx` и `ts-node`. Docker не используется.
- В `server/` и `shared/` только стираемый синтаксис TypeScript, `import type` для типов и расширение `.ts` в каждом относительном импорте.
- Новые runtime-зависимости только эти, с этими версиями: `better-auth@1.7.7`, `hono@4.13.12`, `@hono/node-server@2.1.3`, `drizzle-orm@0.45.3`, `@electric-sql/pglite@0.5.8`, `zod@4.6.5`, `nodemailer@10.0.13`, `qrcode@1.5.4`. Новые dev-зависимости: `drizzle-kit@0.31.11`, `@types/nodemailer@8.0.2`, `@types/qrcode@1.5.6`. Ничего больше: ни библиотек запросов, ни `concurrently`, ни `tsx`.
- `.data/` и `.env` не попадают в git. В репозитории есть только `.env.example`. Секретов в репозитории нет, запасной dev-секрет допустим только вне продакшена.
- Коды ошибок API — ровно эти 15: `invalid_credentials`, `email_not_verified`, `account_banned`, `token_expired`, `token_invalid`, `weak_password`, `email_taken`, `device_limit`, `card_declined`, `validation_failed`, `rate_limited`, `unauthorized`, `forbidden`, `not_found`, `server_error` (`shared/api.ts`). `network` существует только на клиенте.
- В ответах API нет текста для пользователя на английском (или любом другом языке): ошибка — это только `{ error: { code } }` с HTTP-статусом. Текст выбирает сайт: `t.errors[code]`, для неизвестного кода `t.errors.server_error`.
- Каждая новая строка интерфейса есть в `en.ts` и `ru.ts` (`ru: Dictionary`, пропуск ключа ломает сборку). Каждая новая страница вызывает `usePageMeta`, ссылки и переходы только через `LocalLink` / `LocalNavLink` / `LocalNavigate` / `useLocalNavigate`.
- Ошибки в состоянии компонентов хранятся как `Message` (`message((t) => …)` из `src/i18n/useT.ts`), чтобы переключение EN/RU перерисовывало их, как сделано в коммите `85e0a75`.
- Даты показываются только через `src/i18n/format.ts` (`formatDate`, `formatMonthYear`) или `src/auth/account.ts` (`formatDate` для ISO-строк API). Суммы в API в центах, на странице `formatAmount(amount / 100, locale)`.
- Любое обращение к `localStorage` обёрнуто в try/catch.
- Обращение к пользователю на «вы» со строчной буквы. Английские названия (LaslesVPN, Google, Google Authenticator, 1Password, названия ОС и браузеров) не переводятся.
- После каждой задачи проходят `npm run lint && npm test && npm run build && npm run i18n:scan`.
- Каждый коммит: сообщение на английском, затем пустая строка, затем `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (в плане это второй `-m`).
- Сайт в разработке открывается ровно по `APP_URL` (по умолчанию `http://localhost:5173`), API слушает `API_PORT` (по умолчанию 3001). Dev-серверы пользователя на :5174 и :5175 не трогать. Если :5173 занят, задать другой `APP_URL` в `.env`.

### Глоссарий RU (дополняет глоссарий из `docs/superpowers/plans/2026-10-01-i18n-ru.md`)

| EN | RU |
|---|---|
| Two-step sign-in (2FA) | Двухэтапный вход |
| Authenticator app | Приложение-аутентификатор |
| Backup code | Резервный код |
| Session (signed-in browser) | Сеанс |
| Confirm email | Подтвердить email |
| Reset password / Choose a new password | Сброс пароля / Придумайте новый пароль |
| Sign Out on All Devices | Выйти на всех устройствах |
| Continue with Google | Продолжить с Google |
| Email (в тексте) | email (строчными, как в существующем словаре) |
| Link | Ссылка |
| Card declined | Карта отклонена |

## Review Focus

1. **Сайт открыт не по `APP_URL`** (Vite ушёл на свободный порт, вкладка открыта на `127.0.0.1` вместо `localhost`): каждый POST получает `forbidden`, ссылки в письмах ведут на другой адрес, и выглядит это как «вход сломан». Ожидается: `npm run dev` поднимает Vite строго на порту из `APP_URL` или падает с понятной ошибкой, чужой Origin получает 403, а cookie сессии `HttpOnly; SameSite=Lax` и без `Secure` в разработке. Тесты: `devPorts` (Task 2), Origin (Task 6), атрибуты cookie (Task 5).
2. **Перезагрузка `/dashboard` уже вошедшим пользователем.** Пока клиент Better Auth не узнал сессию, `user === null`. Старый `RequireAuth` в этот момент отправил бы на `/signup`. Ожидается: показывается «Загрузка…», затем кабинет. Тест `authGate` (Task 11).
3. **Повторное использование ссылки сброса и старые сеансы.** Ожидается: ссылка работает один раз и не дольше часа, после сброса все прежние сеансы мертвы, старый пароль не подходит. Тесты в Task 5.
4. **Заблокированный пользователь с живой сессией.** Вход заблокированному закрыт (плагин admin), но cookie, выданная до блокировки, жива до 30 дней. Ожидается: любой защищённый эндпоинт отвечает `account_banned`. Тест `requireUser` (Task 6) и вход (Task 5).
5. **Письмо не на том языке.** Регистрация на `/ru`, переключение языка после регистрации, смена email из русской версии. Ожидается: письмо и ссылка в нём (`/ru/...`) на языке страницы или последнего выбранного языка. Тесты: регистрация RU (Task 5), переключение и сброс (Task 7), смена email RU (Task 15).

---

## Карта файлов

**Общий код — `shared/`** (импортируют и `src/`, и `server/`):
- `shared/plans.ts` — `planIds`, `PlanId`, `billings`, `Billing`, `planInfo`, `getPlanInfo`, `YEARLY_MONTHS`, `priceCents`, `deviceLimit` (+ `plans.test.ts`)
- `shared/card.ts` — перенесён из `src/utils/card.ts` без изменений (сервер проверяет карту тем же кодом)
- `shared/api.ts` — `errorCodes`, `ErrorCode`, `isErrorCode`, `ErrorBody`, `locales`/`UserLocale`, `roles`/`Role`, `platformIds`/`PlatformId`, типы ответов `AppConfig`, `Profile`, `Subscription`, `Preferences`, `Me`, `Device`, `Payment`, `CheckoutResult`, `DevMail`

**Сервер — `server/`:**
- `index.ts` — запуск: конфиг, база, почта, Better Auth, сид, `serve()`
- `app.ts` — `createApp(deps)`: Hono, Origin, `/api/config`, `/api/auth/*`, роуты, `notFound`, `onError`
- `config.ts` — `loadConfig(env)` (zod) (+ `config.test.ts`)
- `errors.ts` — `AppError`, `errorBody`, `errorResponse`, `readBody`
- `auth.ts` — `createAuth(deps)`, тип `Auth`
- `auth-errors.ts` — `toErrorCode`, `rewriteAuthError` (+ `auth-errors.test.ts`)
- `middleware.ts` — `checkOrigin`, `requireUser`, `requireRole`, `AppEnv` (+ `middleware.test.ts`)
- `db/schema.ts`, `db/client.ts` (`openDatabase`), `db/migrations/` (генерирует drizzle-kit), `db/seed.ts`, `db/reset.ts` (+ `client.test.ts`, `seed.test.ts`)
- `mail/types.ts`, `mail/templates.ts` (EN/RU), `mail/dev.ts`, `mail/smtp.ts` (+ `templates.test.ts`, `dev.test.ts`)
- `routes/serialize.ts`, `routes/me.ts`, `routes/checkout.ts`, `routes/dev-mail.ts` (+ тесты рядом)
- `test/helpers.ts` — `createTestApp()` и помощники тестов
- Тесты сценариев: `app.test.ts`, `auth.test.ts`, `account.test.ts`, `two-factor.test.ts`, `google.test.ts`, `settings.test.ts`

**Сайт — `src/`:**
- `src/api/` — `client.ts` (`ApiError`, `apiFetch`, `errorFromBody`, `toApiError`), `errorMessage.ts`, `useApi.ts` (`useApi`, `useMe`, `useDevices`, `usePayments`, `useConfig`), `ApiState.tsx`, `checkout.ts` (+ тесты)
- `src/auth/` — `client.ts` (`authClient`), `authCall.ts`, `context.ts` (новые типы), `AuthProvider.tsx` (переписан), `RequireAuth.tsx`, `gate.ts`, `legacy.ts`, `useSyncUserLocale.ts`, `verify.ts`, `totp.ts`, `sessions.ts`, `account.ts` (остаётся только `formatDate`), `ui/VerifyEmailNotice.tsx`, `ui/GoogleButton.tsx` (+ тесты)
- Новые страницы: `src/pages/ForgotPassword.tsx`, `ResetPassword.tsx`, `VerifyEmail.tsx`, `LoginTwoFactor.tsx`, `DevMail.tsx`
- Настройки разбиты на карточки: `src/pages/dashboard/settings/{ProfileCard,EmailCard,PasswordCard,TwoFactorCard,SessionsCard,PreferencesCard,DeleteAccountCard}.tsx`

**Инструменты:** `tsconfig.server.json` (новый, в `references` у `tsconfig.json`), `vitest.config.ts`, `vite.config.ts` (прокси), `drizzle.config.ts`, `scripts/dev.mjs`, `scripts/dev-ports.mjs` (+ тест), `.env.example`, `.gitignore`, `package.json`, `README.md`.

**Удаляются:** `src/utils/card.ts` (переезжает в `shared/`). `src/auth/AuthProvider.tsx` переписывается целиком.

**Как меняются существующие страницы:**
- `Login.tsx`, `Signup.tsx` — async вход и регистрация с кодами ошибок, пароль от 8 символов, язык страницы уходит в регистрацию, переход на `/login/2fa`, ссылка «Забыли пароль?», подстановка email после сброса, кнопка Google (Tasks 11, 12, 14)
- `Checkout.tsx` — тариф из `useMe`, заказ через `POST /api/checkout`, плашка «Подтвердите email» (Tasks 10, 12)
- `dashboard/Overview.tsx`, `Devices.tsx`, `Billing.tsx` — данные из `useMe`/`useDevices`/`usePayments`, изменения через API (Task 10)
- `dashboard/Settings.tsx` — собирается из карточек (Tasks 10, 11, 13, 15)
- `dashboard/DashboardLayout.tsx` — async выход и плашка подтверждения email (Tasks 11, 12)
- `Servers.tsx` — премиум-доступ по `useMe` (Task 10); `components/Header.tsx` — ничего не показывает в блоке входа, пока сессия грузится (Task 11)
- `layout/Layout.tsx` — `useSyncUserLocale()`; `main.tsx` — очистка старых ключей `localStorage` (Task 11); `App.tsx` — новые маршруты (Tasks 12, 13)

### Task 1: Общий код в `shared/`

Сервер должен считать цены и проверять карты тем же кодом, что и сайт. Тарифы без картинок, карточные утилиты и типы ответов API переезжают в `shared/`. Поведение сайта не меняется.

**Files:**
- Create: `shared/plans.ts`, `shared/plans.test.ts`, `shared/api.ts`
- Move: `src/utils/card.ts` → `shared/card.ts` (содержимое без изменений)
- Modify: `src/data/plans.ts` (целиком), `src/data/platforms.ts` (тип `PlatformId`), `src/pages/Checkout.tsx` и `src/pages/dashboard/Billing.tsx` (путь импорта карты), `tsconfig.app.json`, `vitest.config.ts`

**Interfaces:**
- Produces (`shared/plans.ts`): `planIds = ['free','standard','premium'] as const`; `type PlanId`; `billings = ['monthly','yearly'] as const`; `type Billing`; `interface PlanInfo { id: PlanId; price: number /* USD в месяц */; devices: number }`; `planInfo: PlanInfo[]`; `getPlanInfo(id: string | null | undefined): PlanInfo | undefined`; `YEARLY_MONTHS = 10`; `priceCents(plan: PlanId, billing: Billing): number`; `deviceLimit(plan: PlanId | null | undefined): number` (без тарифа 1).
- Produces (`shared/api.ts`): `errorCodes`, `type ErrorCode`, `isErrorCode(v): v is ErrorCode`, `ErrorBody`, `locales`/`UserLocale`, `roles`/`Role`, `platformIds`/`PlatformId`, `AppConfig`, `Profile`, `Subscription`, `Preferences`, `Me`, `Device`, `Payment`, `CheckoutResult`, `DevMail` (поля — в коде ниже).
- Produces (`shared/card.ts`): `formatCardNumber`, `formatExpiry`, `isExpiryValid`, `cardBrand` — те же сигнатуры, что были в `src/utils/card.ts`.
- Produces (`src/data/plans.ts`): `interface Plan extends PlanInfo { image: string }`, `plans: Plan[]`, `getPlan(id)`, реэкспорт `type PlanId`, `type Billing`.

- [ ] **Step 1: Написать падающий тест**

Create `shared/plans.test.ts`:

```ts
import { expect, it } from 'vitest'
import { deviceLimit, priceCents } from './plans.ts'

it('prices orders in cents with two free months on yearly billing', () => {
  expect(priceCents('standard', 'monthly')).toBe(900)
  expect(priceCents('standard', 'yearly')).toBe(9000)
  expect(priceCents('premium', 'yearly')).toBe(12000)
  expect(priceCents('free', 'monthly')).toBe(0)
})

it('gives accounts without a plan one device', () => {
  expect(deviceLimit(null)).toBe(1)
  expect(deviceLimit('standard')).toBe(3)
  expect(deviceLimit('premium')).toBe(6)
})
```

В `vitest.config.ts` добавить `shared` в `include`:

Найти:

```ts
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
```

Заменить на:

```ts
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs', 'shared/**/*.test.ts'],
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test -- shared/plans.test.ts`
Expected: FAIL — модуля `./plans.ts` ещё нет (`Failed to resolve import` / `Cannot find module`).

- [ ] **Step 3: Создать `shared/plans.ts` и `shared/api.ts`**

Create `shared/plans.ts`:

```ts
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
```

Create `shared/api.ts`:

```ts
// Shapes of the JSON the API server returns. The site and the server both
// import these, so a renamed field breaks the build instead of a page.
import type { Billing, PlanId } from './plans.ts'

export const errorCodes = [
  'invalid_credentials',
  'email_not_verified',
  'account_banned',
  'token_expired',
  'token_invalid',
  'weak_password',
  'email_taken',
  'device_limit',
  'card_declined',
  'validation_failed',
  'rate_limited',
  'unauthorized',
  'forbidden',
  'not_found',
  'server_error',
] as const
export type ErrorCode = (typeof errorCodes)[number]

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (errorCodes as readonly string[]).includes(value)
}

// Every error response has this body and only this body.
export interface ErrorBody {
  error: { code: ErrorCode }
}

export const locales = ['en', 'ru'] as const
export type UserLocale = (typeof locales)[number]

export const roles = ['customer', 'admin', 'support', 'finance'] as const
export type Role = (typeof roles)[number]

export const platformIds = ['windows', 'macos', 'ios', 'android', 'linux'] as const
export type PlatformId = (typeof platformIds)[number]

export interface AppConfig {
  googleEnabled: boolean
  devMail: boolean
}

export interface Profile {
  id: string
  name: string
  email: string
  emailVerified: boolean
  locale: UserLocale
  role: Role
  twoFactorEnabled: boolean
  createdAt: string
}

export interface Subscription {
  // The plan in force right now: a cancelled plan turns into 'free' once renewsAt passes.
  plan: PlanId
  billing: Billing | null
  status: 'active' | 'canceled'
  renewsAt: string | null
  createdAt: string
}

export interface Preferences {
  autoConnect: boolean
  killSwitch: boolean
  newsletter: boolean
}

export interface Me {
  user: Profile
  subscription: Subscription | null
  preferences: Preferences
}

export interface Device {
  id: string
  name: string
  platform: PlatformId
  createdAt: string
}

export interface Payment {
  id: string
  plan: PlanId
  billing: Billing
  // Cents.
  amount: number
  cardBrand: string
  cardLast4: string
  status: 'succeeded'
  createdAt: string
}

export interface CheckoutResult {
  subscription: Subscription
  payment: Payment | null
}

export interface DevMail {
  id: number
  to: string
  subject: string
  text: string
  html: string
  createdAt: string
}
```

- [ ] **Step 4: Перенести карточные утилиты**

```bash
mkdir -p shared
git mv src/utils/card.ts shared/card.ts
```

В `src/pages/Checkout.tsx`:

Найти:

```ts
import { cardBrand, formatCardNumber, formatExpiry, isExpiryValid } from '../utils/card'
```

Заменить на:

```ts
import { cardBrand, formatCardNumber, formatExpiry, isExpiryValid } from '../../shared/card'
```

В `src/pages/dashboard/Billing.tsx`:

Найти:

```ts
import { cardBrand, formatCardNumber, formatExpiry, isExpiryValid } from '../../utils/card'
```

Заменить на:

```ts
import { cardBrand, formatCardNumber, formatExpiry, isExpiryValid } from '../../../shared/card'
```

- [ ] **Step 5: Тарифы сайта поверх `shared/plans.ts`**

Replace `src/data/plans.ts` целиком:

```ts
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
```

В `src/data/platforms.ts` тип `PlatformId` теперь берётся из `shared/api.ts` (сервер проверяет по нему платформу устройства):

Найти:

```ts
import type { Locale } from '../i18n/locales'
```

Заменить на:

```ts
import type { PlatformId } from '../../shared/api'
import type { Locale } from '../i18n/locales'
```

Найти:

```ts
export type PlatformId = 'windows' | 'macos' | 'ios' | 'android' | 'linux'
```

Заменить на:

```ts
// The ids are shared with the API server, which validates device platforms.
export type { PlatformId }
```

В `tsconfig.app.json`:

Найти:

```json
  "include": ["src"]
```

Заменить на:

```json
  "include": ["src", "shared"]
```

- [ ] **Step 6: Проверить, что тест проходит**

Run: `npm test -- shared/plans.test.ts`
Expected: PASS (2 теста).

- [ ] **Step 7: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 8: Commit**

```bash
git add shared src/data/plans.ts src/data/platforms.ts src/pages/Checkout.tsx src/pages/dashboard/Billing.tsx tsconfig.app.json vitest.config.ts
git commit -m "Move plan facts, card helpers and API types into shared/" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 2: Каркас API и запуск одной командой

Hono-приложение с `/api/config`, единым форматом ошибок и конфигом из `.env`; `npm run dev` поднимает Vite и API вместе, Vite проксирует `/api`.

**Files:**
- Create: `server/config.ts`, `server/config.test.ts`, `server/errors.ts`, `server/app.ts`, `server/app.test.ts`, `server/index.ts`, `server/test/helpers.ts`, `tsconfig.server.json`, `scripts/dev.mjs`, `scripts/dev-ports.mjs`, `scripts/dev-ports.test.mjs`, `.env.example`
- Modify: `package.json` (зависимости, скрипты), `tsconfig.json`, `vitest.config.ts`, `vite.config.ts`, `.gitignore`

**Interfaces:**
- Consumes: `AppConfig`, `ErrorBody`, `ErrorCode` из `shared/api.ts` (Task 1).
- Produces: `loadConfig(env?: Record<string, string | undefined>): Config`, где `Config = { isProduction, port, appUrl /* origin */, secret, dataDir, devMail, google: { clientId, clientSecret } | null, smtp: { host, port, user?, password?, from } | null, seed: { adminPassword, demoPassword } }`.
- Produces: `class AppError(code: ErrorCode, status)`, `errorBody(code)`, `errorResponse(c, code, status)`, `readBody(c, zodSchema)` (любая ошибка → 400 `validation_failed`).
- Produces: `createApp(deps: AppDeps)`; здесь `AppDeps = { config }`, позже Tasks 4, 5 добавят `db` и `auth`.
- Produces: `createTestApp(options?: { env?: Record<string, string> })` → `{ app, config, call(path, { method?, body?, cookie?, origin?, headers? }), close() }` и `json<T>(res)`. `call` по умолчанию ставит `Origin: http://localhost:5173`, как браузер на сайте. Tasks 4 и 5 расширяют возвращаемый объект, не ломая этих полей.
- Produces: `devPorts(env) → { web, api }` в `scripts/dev-ports.mjs`.

- [ ] **Step 1: Установить зависимости**

```bash
npm install hono@4.13.12 @hono/node-server@2.1.3 zod@4.6.5
```

- [ ] **Step 2: tsconfig для сервера и Vitest**

Create `tsconfig.server.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.server.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "types": ["node"],
    "skipLibCheck": true,

    /* Node runs these files directly (type stripping) */
    "module": "nodenext",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["server", "shared"]
}
```

Replace `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.server.json" }
  ]
}
```

Replace `vitest.config.ts` (часовой пояс из `85e0a75` сохраняется):

```ts
import { defineConfig } from 'vitest/config'

// Pin the zone so date tests do not depend on the machine: far enough from
// UTC that a date-only string formatted in local time would shift a day.
process.env.TZ = 'America/Los_Angeles'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs', 'shared/**/*.test.ts', 'server/**/*.test.ts'],
    // Server tests hash passwords and start an in-memory Postgres per file.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
})
```

- [ ] **Step 3: Написать падающие тесты**

Create `server/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.ts'

describe('loadConfig', () => {
  it('has working local defaults', () => {
    const config = loadConfig({})
    expect(config).toMatchObject({
      isProduction: false,
      port: 3001,
      appUrl: 'http://localhost:5173',
      dataDir: '.data/pglite',
      devMail: true,
      google: null,
      smtp: null,
    })
    expect(config.secret.length).toBeGreaterThanOrEqual(32)
  })

  it('treats empty values from .env as unset', () => {
    const config = loadConfig({ BETTER_AUTH_SECRET: '', GOOGLE_CLIENT_ID: '', SMTP_HOST: '', API_PORT: '' })
    expect(config).toMatchObject({ google: null, smtp: null, port: 3001 })
  })

  it('turns Google on only with both keys', () => {
    expect(loadConfig({ GOOGLE_CLIENT_ID: 'id' }).google).toBeNull()
    expect(loadConfig({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 's' }).google).toEqual({
      clientId: 'id',
      clientSecret: 's',
    })
  })

  it('normalises APP_URL to an origin', () => {
    expect(loadConfig({ APP_URL: 'https://vpn.example.com/' }).appUrl).toBe('https://vpn.example.com')
  })

  it('production needs a real secret and never exposes dev mail', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/BETTER_AUTH_SECRET/)
    const config = loadConfig({ NODE_ENV: 'production', BETTER_AUTH_SECRET: 'x'.repeat(32) })
    expect(config).toMatchObject({ isProduction: true, devMail: false })
  })

  it('refuses DATABASE_URL until an external Postgres driver is wired up', () => {
    expect(() => loadConfig({ DATABASE_URL: 'postgres://localhost/db' })).toThrow(/DATABASE_URL/)
  })
})
```

Create `server/test/helpers.ts` (первая версия, Tasks 4 и 5 её расширят):

```ts
// Test harness: a fresh app per call. Test files call createTestApp() in
// beforeAll and close() in afterAll, and talk to the app only through call().
import { createApp } from '../app.ts'
import { loadConfig } from '../config.ts'

export const APP_URL = 'http://localhost:5173'

interface CallOptions {
  method?: string
  body?: unknown
  cookie?: string
  origin?: string | null
  headers?: Record<string, string>
}

export async function createTestApp(options: { env?: Record<string, string> } = {}) {
  const config = loadConfig({ NODE_ENV: 'test', APP_URL, ...options.env })
  const app = createApp({ config })

  // Like a browser on the site: JSON body, Origin of the site, optional cookie.
  async function call(path: string, { method = 'GET', body, cookie, origin = APP_URL, headers = {} }: CallOptions = {}) {
    const h: Record<string, string> = { ...headers }
    if (origin) h.origin = origin
    if (cookie) h.cookie = cookie
    if (body !== undefined) h['content-type'] = 'application/json'
    return app.request(path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) })
  }

  return { app, config, call, close: async () => {} }
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>

export async function json<T = Record<string, unknown>>(res: Response): Promise<T> {
  return (await res.json()) as T
}
```

Create `server/app.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTestApp, json, type TestApp } from './test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
  // A route that crashes, to see what the browser gets.
  t.app.get('/api/__boom', () => {
    throw new Error('secret detail')
  })
})
afterAll(async () => {
  await t.close()
})

describe('app', () => {
  it('/api/config tells the site which optional features are on', async () => {
    expect(await json(await t.call('/api/config'))).toEqual({ googleEnabled: false, devMail: true })
  })

  it('unknown API paths are not_found', async () => {
    const res = await t.call('/api/nope')
    expect(res.status).toBe(404)
    expect(await json(res)).toEqual({ error: { code: 'not_found' } })
  })

  it('a crash is a bare server_error, without details', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await t.call('/api/__boom')
    expect(res.status).toBe(500)
    expect(await json(res)).toEqual({ error: { code: 'server_error' } })
    spy.mockRestore()
  })
})
```

Create `scripts/dev-ports.test.mjs`:

```js
import { expect, it } from 'vitest'
import { devPorts } from './dev-ports.mjs'

it('runs Vite on the APP_URL port and the API on 3001 by default', () => {
  expect(devPorts({})).toEqual({ web: '5173', api: '3001' })
  expect(devPorts({ APP_URL: 'http://localhost:4000', API_PORT: '4001' })).toEqual({ web: '4000', api: '4001' })
})
```

- [ ] **Step 4: Убедиться, что тесты падают**

Run: `npm test -- server scripts/dev-ports.test.mjs`
Expected: FAIL — нет модулей `./config.ts`, `../app.ts`, `./dev-ports.mjs`.

- [ ] **Step 5: Конфиг и ошибки**

Create `server/config.ts`:

```ts
import * as z from 'zod'

const DEV_SECRET = 'dev-only-secret-change-me-dev-only-secret'

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  API_PORT: z.coerce.number().int().positive().default(3001),
  APP_URL: z.url().default('http://localhost:5173'),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  DATABASE_URL: z.string().optional(),
  DATA_DIR: z.string().default('.data/pglite'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('LaslesVPN <no-reply@laslesvpn.test>'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('admin-password'),
  SEED_DEMO_PASSWORD: z.string().min(8).default('demo-password'),
})

export interface Config {
  isProduction: boolean
  port: number
  // Origin of the site as the browser sees it, e.g. http://localhost:5173.
  appUrl: string
  secret: string
  dataDir: string
  devMail: boolean
  google: { clientId: string; clientSecret: string } | null
  smtp: { host: string; port: number; user?: string; password?: string; from: string } | null
  seed: { adminPassword: string; demoPassword: string }
}

// Reads process.env (or a test object) once at startup. Throws on values
// that would make the server unsafe or unusable.
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  // `KEY=` lines in .env arrive as empty strings: treat them as unset.
  const e = envSchema.parse(Object.fromEntries(Object.entries(env).filter(([, value]) => value !== '')))
  const isProduction = e.NODE_ENV === 'production'
  if (isProduction && !e.BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is required in production')
  if (e.DATABASE_URL) {
    throw new Error('DATABASE_URL (external Postgres) is not wired up yet; unset it to use the local PGlite database')
  }
  return {
    isProduction,
    port: e.API_PORT,
    appUrl: new URL(e.APP_URL).origin,
    secret: e.BETTER_AUTH_SECRET ?? DEV_SECRET,
    dataDir: e.DATA_DIR,
    devMail: !isProduction,
    google:
      e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
        ? { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET }
        : null,
    smtp: e.SMTP_HOST
      ? { host: e.SMTP_HOST, port: e.SMTP_PORT, user: e.SMTP_USER, password: e.SMTP_PASSWORD, from: e.SMTP_FROM }
      : null,
    seed: { adminPassword: e.SEED_ADMIN_PASSWORD, demoPassword: e.SEED_DEMO_PASSWORD },
  }
}
```

Create `server/errors.ts`:

```ts
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type * as z from 'zod'
import type { ErrorBody, ErrorCode } from '../shared/api.ts'

// Thrown by route handlers; app.onError turns it into { error: { code } }.
export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: ContentfulStatusCode

  constructor(code: ErrorCode, status: ContentfulStatusCode) {
    super(code)
    this.code = code
    this.status = status
  }
}

export function errorBody(code: ErrorCode): ErrorBody {
  return { error: { code } }
}

export function errorResponse(c: Context, code: ErrorCode, status: ContentfulStatusCode) {
  return c.json(errorBody(code), status)
}

// Parses a JSON body with a zod schema; any problem is a 400 validation_failed.
export async function readBody<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    throw new AppError('validation_failed', 400)
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new AppError('validation_failed', 400)
  return parsed.data
}
```

- [ ] **Step 6: Приложение и точка входа**

Create `server/app.ts`:

```ts
import { Hono } from 'hono'
import type { AppConfig } from '../shared/api.ts'
import type { Config } from './config.ts'
import { AppError, errorResponse } from './errors.ts'

export interface AppDeps {
  config: Config
}

export function createApp({ config }: AppDeps) {
  const app = new Hono()

  app.get('/api/config', (c) => {
    const body: AppConfig = { googleEnabled: config.google !== null, devMail: config.devMail }
    return c.json(body)
  })

  app.notFound((c) => errorResponse(c, 'not_found', 404))
  app.onError((err, c) => {
    if (err instanceof AppError) return errorResponse(c, err.code, err.status)
    console.error(err)
    return errorResponse(c, 'server_error', 500)
  })

  return app
}
```

Create `server/index.ts`:

```ts
// API server entry. In development scripts/dev.mjs runs it with `node --watch`;
// Node runs the TypeScript directly (type stripping), no build step.
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'

const config = loadConfig()
const app = createApp({ config })
const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`[api] http://localhost:${port} (site: ${config.appUrl})`)
})

function shutdown() {
  server.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

- [ ] **Step 7: Запуск двух процессов и прокси**

Create `scripts/dev-ports.mjs`:

```js
// Ports for `npm run dev`. The site must run exactly at APP_URL: the API
// checks Origin against it and Better Auth puts it into email links, so Vite
// gets that port with --strictPort instead of quietly picking another one.
export function devPorts(env) {
  const appUrl = new URL(env.APP_URL || 'http://localhost:5173')
  return {
    web: appUrl.port || (appUrl.protocol === 'https:' ? '443' : '80'),
    api: env.API_PORT || '3001',
  }
}
```

Create `scripts/dev.mjs`:

```js
// `npm run dev`: starts the API server and Vite together and stops both when
// either exits or on Ctrl+C. A small script instead of an extra dependency.
import { spawn } from 'node:child_process'
import { devPorts } from './dev-ports.mjs'

try {
  process.loadEnvFile('.env')
} catch {
  // .env is optional; defaults work for local development.
}

const ports = devPorts(process.env)
const isWindows = process.platform === 'win32'
const processes = [
  ['api', process.execPath, ['--watch', 'server/index.ts']],
  ['web', isWindows ? 'npx.cmd' : 'npx', ['vite', '--port', ports.web, '--strictPort']],
]

let stopping = false
const children = processes.map(([name, command, args]) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: isWindows,
    env: { ...process.env, API_PORT: ports.api },
  })
  child.on('exit', (code) => {
    if (!stopping) console.log(`[dev] ${name} stopped (exit code ${code ?? 0}); stopping the other one`)
    stopAll(code ?? 0)
  })
  return child
})

function stopAll(code) {
  if (stopping) return
  stopping = true
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM')
  process.exitCode = code
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
```

Replace `vite.config.ts`:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The API (server/index.ts) listens on API_PORT; the browser only ever talks
// to Vite, so cookies and Origin are those of the site itself.
const apiPort = process.env.API_PORT ?? '3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // xfwd adds X-Forwarded-For, so rate limiting sees the real client IP.
      '/api': { target: `http://127.0.0.1:${apiPort}`, xfwd: true },
    },
  },
  build: {
    outDir: 'build',
  },
})
```

Скрипты в `package.json` (`dev` заменяется, `api` запускает только сервер):

```bash
npm pkg set scripts.dev="node scripts/dev.mjs" scripts.api="node --env-file-if-exists=.env server/index.ts"
```

Create `.env.example`:

```bash
# Copy to .env and adjust. .env is git-ignored: never commit real secrets.
# Empty values count as unset.

# Where the site runs. `npm run dev` starts Vite on exactly this port, email
# links point here, and the API accepts changing requests only from this origin.
APP_URL=http://localhost:5173
# Port of the API server; Vite proxies /api to it.
API_PORT=3001

# At least 32 random characters, e.g. `openssl rand -base64 32`.
# Required when NODE_ENV=production; development falls back to a fixed dev secret.
BETTER_AUTH_SECRET=

# Folder of the local PGlite database. `npm run db:reset` deletes it.
DATA_DIR=.data/pglite
# External Postgres is not wired up yet: leave DATABASE_URL unset.
# DATABASE_URL=

# Google sign-in (optional). Without both values the Google button is hidden.
# Authorized redirect URI in Google Cloud: http://localhost:5173/api/auth/callback/google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Real email (optional). Without SMTP_HOST every email is shown at /dev/mail
# and printed in the API console.
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=LaslesVPN <no-reply@laslesvpn.test>

# Passwords of the seeded accounts admin@laslesvpn.test and demo@laslesvpn.test.
SEED_ADMIN_PASSWORD=admin-password
SEED_DEMO_PASSWORD=demo-password
```

В `.gitignore` в блок `# Env and caches` добавить строку (локальная база):

Найти:

```bash
.vite/
*.tsbuildinfo
```

Заменить на:

```bash
.vite/
*.tsbuildinfo
.data/
```

- [ ] **Step 8: Проверить, что тесты проходят**

Run: `npm test -- server scripts/dev-ports.test.mjs`
Expected: PASS.

- [ ] **Step 9: Ручная проверка запуска**

Run: `npm run dev`, затем в другом терминале `curl -s http://localhost:5173/api/config`
Expected: `{"googleEnabled":false,"devMail":true}`; в консоли `[api] http://localhost:3001 (site: http://localhost:5173)` и строка Vite `Local: http://localhost:5173/`. Ctrl+C гасит оба процесса. Если :5173 занят, Vite падает с `Port 5173 is already in use`: задайте другой `APP_URL` в `.env`, а не порт Vite.

- [ ] **Step 10: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.server.json vitest.config.ts vite.config.ts .gitignore .env.example server scripts/dev.mjs scripts/dev-ports.mjs scripts/dev-ports.test.mjs
git commit -m "Add the API server skeleton and run it next to Vite" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 3: База данных, схема и миграции

PGlite в `.data/pglite`, схема Drizzle со всеми таблицами spec (Better Auth + свои), миграции применяются при старте.

**Files:**
- Create: `server/db/schema.ts`, `server/db/client.ts`, `server/db/client.test.ts`, `drizzle.config.ts`, `server/db/migrations/*` (генерирует drizzle-kit)
- Modify: `server/index.ts`, `tsconfig.node.json`, `package.json`

**Interfaces:**
- Produces: таблицы Drizzle `user`, `session`, `account`, `verification`, `twoFactor` (таблица `two_factor`), `subscription`, `payment`, `device`, `preferences`, `devMail` (таблица `dev_mail`, `id` — растущее целое).
- Produces: `type Db = PgliteDatabase<typeof schema>`; `interface Database { db: Db; close(): Promise<void> }`; `openDatabase(dataDir?: string): Promise<Database>` (без `dataDir` — база в памяти, для тестов; миграции применяются всегда).

- [ ] **Step 1: Установить зависимости**

```bash
npm install drizzle-orm@0.45.3 @electric-sql/pglite@0.5.8
npm install -D drizzle-kit@0.31.11
npm pkg set scripts.db:generate="drizzle-kit generate"
```

- [ ] **Step 2: Написать падающий тест**

Create `server/db/client.test.ts`:

```ts
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { openDatabase, type Database } from './client.ts'
import { device, payment, preferences, subscription, user } from './schema.ts'

let database: Database
beforeAll(async () => {
  database = await openDatabase()
})
afterAll(async () => {
  await database.close()
})

it('applies the migrations to a fresh in-memory database', async () => {
  const result = await database.db.execute<{ table_name: string }>(
    sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
  )
  expect(result.rows.map((r) => r.table_name)).toEqual([
    'account',
    'dev_mail',
    'device',
    'payment',
    'preferences',
    'session',
    'subscription',
    'two_factor',
    'user',
    'verification',
  ])
})

it('new users are customers writing in English by default', async () => {
  const [row] = await database.db
    .insert(user)
    .values({ id: 'u-default', name: 'Default', email: 'default@example.com' })
    .returning()
  expect(row).toMatchObject({ role: 'customer', locale: 'en', emailVerified: false, banned: false })
})

it("deleting a user deletes all of the user's rows", async () => {
  const { db } = database
  await db.insert(user).values({ id: 'u1', name: 'Ann', email: 'ann@example.com' })
  await db.insert(subscription).values({ userId: 'u1', plan: 'standard', billing: 'monthly' })
  await db.insert(device).values({ id: 'd1', userId: 'u1', name: 'Laptop', platform: 'macos' })
  await db.insert(payment).values({
    id: 'INV-1',
    userId: 'u1',
    plan: 'standard',
    billing: 'monthly',
    amount: 900,
    cardBrand: 'Visa',
    cardLast4: '4242',
  })
  await db.insert(preferences).values({ userId: 'u1' })

  await db.delete(user).where(eq(user.id, 'u1'))

  for (const table of [subscription, device, payment, preferences]) {
    expect(await db.select().from(table).where(eq(table.userId, 'u1'))).toEqual([])
  }
})

it('keeps data between openings of the same folder', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'laslesvpn-db-'))
  try {
    const first = await openDatabase(dir)
    await first.db.insert(user).values({ id: 'u2', name: 'Bo', email: 'bo@example.com' })
    await first.close()
    const second = await openDatabase(dir)
    expect(await second.db.select().from(user)).toHaveLength(1)
    await second.close()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
```

- [ ] **Step 3: Убедиться, что тест падает**

Run: `npm test -- server/db/client.test.ts`
Expected: FAIL — нет модулей `./client.ts` и `./schema.ts`.

- [ ] **Step 4: Схема**

Create `server/db/schema.ts`:

```ts
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
```

Create `drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
})
```

В `tsconfig.node.json`:

Найти:

```json
  "include": ["vite.config.ts", "vitest.config.ts"]
```

Заменить на:

```json
  "include": ["vite.config.ts", "vitest.config.ts", "drizzle.config.ts"]
```

- [ ] **Step 5: Сгенерировать первую миграцию**

Run: `npm run db:generate -- --name init`
Expected: `10 tables` в выводе и файлы `server/db/migrations/0000_init.sql`, `server/db/migrations/meta/_journal.json`, `server/db/migrations/meta/0000_snapshot.json`. Эти файлы коммитятся и руками не правятся.

- [ ] **Step 6: Подключение**

Create `server/db/client.ts`:

```ts
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from './schema.ts'

export type Db = PgliteDatabase<typeof schema>

export interface Database {
  db: Db
  close: () => Promise<void>
}

const migrationsFolder = fileURLToPath(new URL('./migrations', import.meta.url))

// Opens PGlite (embedded Postgres) and applies pending migrations.
// `dataDir` is a folder on disk; without it the database lives in memory (tests).
export async function openDatabase(dataDir?: string): Promise<Database> {
  if (dataDir) mkdirSync(dataDir, { recursive: true })
  const client = new PGlite(dataDir)
  const db = drizzle({ client, schema })
  await migrate(db, { migrationsFolder })
  return { db, close: () => client.close() }
}
```

Replace `server/index.ts` (база открывается при старте, миграции применяются):

```ts
// API server entry. In development scripts/dev.mjs runs it with `node --watch`;
// Node runs the TypeScript directly (type stripping), no build step.
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'
import { openDatabase } from './db/client.ts'

const config = loadConfig()
// Creates .data/pglite on first start and applies pending migrations.
const { close } = await openDatabase(config.dataDir)
const app = createApp({ config })
const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`[api] http://localhost:${port} (site: ${config.appUrl})`)
})

function shutdown() {
  server.close()
  void close().finally(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

- [ ] **Step 7: Проверить, что тест проходит**

Run: `npm test -- server/db/client.test.ts`
Expected: PASS (4 теста).

- [ ] **Step 8: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

Затем `npm run api` и Ctrl+C: появляется папка `.data/pglite`, `git status` её не показывает.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json drizzle.config.ts tsconfig.node.json server/db server/index.ts
git commit -m "Add the PGlite database, Drizzle schema and first migration" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 4: Почта: шаблоны EN/RU, dev-почта и `/api/dev/mail`

Интерфейс `Mailer` с двумя реализациями: в разработке письма пишутся в `dev_mail` и в консоль, в продакшене уходят по SMTP. Шаблоны трёх писем на двух языках.

**Files:**
- Create: `server/mail/types.ts`, `server/mail/templates.ts`, `server/mail/templates.test.ts`, `server/mail/dev.ts`, `server/mail/dev.test.ts`, `server/mail/smtp.ts`, `server/routes/dev-mail.ts`, `server/routes/dev-mail.test.ts`
- Modify: `server/app.ts`, `server/test/helpers.ts`, `server/index.ts`, `package.json`

**Interfaces:**
- Consumes: `openDatabase`, `Db`, `devMail` (Task 3); `UserLocale`, `DevMail` (Task 1).
- Produces: `interface MailMessage { to; subject; text; html }`, `interface Mailer { send(message): Promise<void> }`.
- Produces: `type MailKind = 'verifyEmail' | 'resetPassword' | 'changeEmail'`; `renderMail(kind, locale, { to, name, url }): MailMessage`; `siteLink(appUrl, locale, path, params): string` (`/ru` для русского).
- Produces: `createDevMailer(db, log = console.log): Mailer`, `createSmtpMailer(smtp): Mailer`, `devMailRoutes({ db })`.
- Produces: `AppDeps = { config, db }`; `createTestApp()` теперь отдаёт ещё `db`, `mailer`, `lastMail(to)`, `mailCount(to, subject?)`, `linkIn(mail): URL`, `tokenIn(mail): string`.

- [ ] **Step 1: Установить зависимости**

```bash
npm install nodemailer@10.0.13
npm install -D @types/nodemailer@8.0.2
```

- [ ] **Step 2: Написать падающие тесты**

Create `server/mail/templates.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { renderMail, siteLink } from './templates.ts'

describe('siteLink', () => {
  it('points at the site page in the user language', () => {
    expect(siteLink('http://localhost:5173', 'en', '/verify-email', { token: 'a.b' })).toBe(
      'http://localhost:5173/verify-email?token=a.b',
    )
    expect(siteLink('http://localhost:5173', 'ru', '/reset-password', { token: 't', email: 'a+b@c.d' })).toBe(
      'http://localhost:5173/ru/reset-password?token=t&email=a%2Bb%40c.d',
    )
  })
})

describe('renderMail', () => {
  const data = { to: 'ann@example.com', name: 'Ann <b>', url: 'http://localhost:5173/verify-email?token=x&y=1' }

  it('writes English and Russian versions of every mail', () => {
    for (const kind of ['verifyEmail', 'resetPassword', 'changeEmail'] as const) {
      const en = renderMail(kind, 'en', data)
      const ru = renderMail(kind, 'ru', data)
      expect(en.to).toBe('ann@example.com')
      expect(en.subject).toMatch(/LaslesVPN/)
      expect(ru.subject).toMatch(/[а-яё]/i)
      expect(ru.subject).not.toBe(en.subject)
      expect(en.text).toContain(data.url)
      expect(ru.text).toContain(data.url)
    }
  })

  it('greets by name and escapes it in HTML', () => {
    const mail = renderMail('verifyEmail', 'ru', data)
    expect(mail.text).toContain('Здравствуйте, Ann <b>!')
    expect(mail.html).toContain('Ann &#60;b&#62;')
    expect(mail.html).toContain('href="http://localhost:5173/verify-email?token=x&#38;y=1"')
  })
})
```

Create `server/mail/dev.test.ts`:

```ts
import { afterAll, beforeAll, expect, it } from 'vitest'
import { openDatabase, type Database } from '../db/client.ts'
import { devMail } from '../db/schema.ts'
import { createDevMailer } from './dev.ts'

let database: Database
beforeAll(async () => {
  database = await openDatabase()
})
afterAll(async () => {
  await database.close()
})

it('stores the mail in dev_mail and prints it', async () => {
  const lines: string[] = []
  const mailer = createDevMailer(database.db, (line) => lines.push(line))
  await mailer.send({ to: 'a@example.com', subject: 'Hi', text: 'Body http://x', html: '<p>Body</p>' })

  const rows = await database.db.select().from(devMail)
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({ to: 'a@example.com', subject: 'Hi', text: 'Body http://x', html: '<p>Body</p>' })
  expect(lines.join('\n')).toContain('a@example.com')
  expect(lines.join('\n')).toContain('Body http://x')
})
```

Create `server/routes/dev-mail.test.ts`:

```ts
import { afterAll, beforeAll, expect, it } from 'vitest'
import type { DevMail } from '../../shared/api.ts'
import { createTestApp, json, type TestApp } from '../test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

it('lists captured mail, newest first', async () => {
  await t.mailer.send({ to: 'a@example.com', subject: 'First', text: 'one', html: '<p>one</p>' })
  await t.mailer.send({ to: 'b@example.com', subject: 'Second', text: 'two', html: '<p>two</p>' })
  const mails = await json<DevMail[]>(await t.call('/api/dev/mail'))
  expect(mails.map((m) => m.subject)).toEqual(['Second', 'First'])
  expect(mails[0]).toMatchObject({ to: 'b@example.com', text: 'two', html: '<p>two</p>' })
  expect(Date.parse(mails[0].createdAt)).not.toBeNaN()
})

it('does not exist in production', async () => {
  const prod = await createTestApp({ env: { NODE_ENV: 'production', BETTER_AUTH_SECRET: 'p'.repeat(32) } })
  try {
    const res = await prod.call('/api/dev/mail')
    expect(res.status).toBe(404)
    expect(await json(await prod.call('/api/config'))).toEqual({ googleEnabled: false, devMail: false })
  } finally {
    await prod.close()
  }
})
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `npm test -- server/mail server/routes`
Expected: FAIL — нет модулей `./templates.ts`, `./dev.ts`; у `createTestApp()` нет `mailer`.

- [ ] **Step 4: Почта**

Create `server/mail/types.ts`:

```ts
export interface MailMessage {
  to: string
  subject: string
  text: string
  html: string
}

export interface Mailer {
  send: (message: MailMessage) => Promise<void>
}
```

Create `server/mail/templates.ts`:

```ts
import type { UserLocale } from '../../shared/api.ts'
import type { MailMessage } from './types.ts'

export type MailKind = 'verifyEmail' | 'resetPassword' | 'changeEmail'

interface Copy {
  subject: string
  greeting: (name: string) => string
  body: string
  button: string
  ignore: string
}

// Plain templates, one per message, in both site languages.
const copy: Record<UserLocale, Record<MailKind, Copy>> = {
  en: {
    verifyEmail: {
      subject: 'Confirm your email for LaslesVPN',
      greeting: (name) => `Hi ${name},`,
      body: 'Please confirm your email address to finish setting up your LaslesVPN account.',
      button: 'Confirm email',
      ignore: "If you didn't create an account, you can ignore this email.",
    },
    resetPassword: {
      subject: 'Reset your LaslesVPN password',
      greeting: (name) => `Hi ${name},`,
      body: 'Someone asked to reset the password for your LaslesVPN account. The link works once and expires in 1 hour.',
      button: 'Choose a new password',
      ignore: "If it wasn't you, ignore this email: your password stays the same.",
    },
    changeEmail: {
      subject: 'Confirm your new email for LaslesVPN',
      greeting: (name) => `Hi ${name},`,
      body: 'Confirm this address to make it the new email for your LaslesVPN account.',
      button: 'Confirm new email',
      ignore: "If you didn't ask for this change, ignore this email: your account keeps its current address.",
    },
  },
  ru: {
    verifyEmail: {
      subject: 'Подтвердите email для LaslesVPN',
      greeting: (name) => `Здравствуйте, ${name}!`,
      body: 'Подтвердите адрес электронной почты, чтобы завершить настройку аккаунта LaslesVPN.',
      button: 'Подтвердить email',
      ignore: 'Если вы не создавали аккаунт, просто проигнорируйте это письмо.',
    },
    resetPassword: {
      subject: 'Сброс пароля LaslesVPN',
      greeting: (name) => `Здравствуйте, ${name}!`,
      body: 'Кто-то запросил сброс пароля для вашего аккаунта LaslesVPN. Ссылка одноразовая и действует 1 час.',
      button: 'Задать новый пароль',
      ignore: 'Если это были не вы, проигнорируйте письмо: пароль останется прежним.',
    },
    changeEmail: {
      subject: 'Подтвердите новый email для LaslesVPN',
      greeting: (name) => `Здравствуйте, ${name}!`,
      body: 'Подтвердите этот адрес, чтобы он стал новым email вашего аккаунта LaslesVPN.',
      button: 'Подтвердить новый email',
      ignore: 'Если вы не запрашивали смену адреса, проигнорируйте письмо: у аккаунта останется прежний email.',
    },
  },
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)
}

export function renderMail(
  kind: MailKind,
  locale: UserLocale,
  data: { to: string; name: string; url: string },
): MailMessage {
  const c = copy[locale][kind]
  const text = [c.greeting(data.name), '', c.body, '', `${c.button}: ${data.url}`, '', c.ignore, '', 'LaslesVPN'].join('\n')
  const html = [
    `<p>${escapeHtml(c.greeting(data.name))}</p>`,
    `<p>${escapeHtml(c.body)}</p>`,
    `<p><a href="${escapeHtml(data.url)}">${escapeHtml(c.button)}</a></p>`,
    `<p>${escapeHtml(c.ignore)}</p>`,
    '<p>LaslesVPN</p>',
  ].join('\n')
  return { to: data.to, subject: c.subject, text, html }
}

// Links in emails open the site page in the user's language; the page then
// calls the API with the token.
export function siteLink(appUrl: string, locale: UserLocale, path: string, params: Record<string, string>) {
  const url = new URL((locale === 'ru' ? '/ru' : '') + path, appUrl)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}
```

Create `server/mail/dev.ts`:

```ts
import type { Db } from '../db/client.ts'
import { devMail } from '../db/schema.ts'
import type { Mailer } from './types.ts'

// Development mailer: nothing leaves the machine. Messages are stored in
// dev_mail (shown at /dev/mail) and printed to the console.
export function createDevMailer(db: Db, log: (line: string) => void = console.log): Mailer {
  return {
    async send(message) {
      await db.insert(devMail).values(message)
      log(`[mail] to ${message.to}: ${message.subject}\n${message.text}\n`)
    },
  }
}
```

Create `server/mail/smtp.ts`:

```ts
import nodemailer from 'nodemailer'
import type { Config } from '../config.ts'
import type { Mailer } from './types.ts'

export function createSmtpMailer(smtp: NonNullable<Config['smtp']>): Mailer {
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
  })
  return {
    async send(message) {
      await transport.sendMail({ from: smtp.from, ...message })
    },
  }
}
```

Create `server/routes/dev-mail.ts`:

```ts
import { desc } from 'drizzle-orm'
import { Hono } from 'hono'
import type { DevMail } from '../../shared/api.ts'
import type { Db } from '../db/client.ts'
import { devMail } from '../db/schema.ts'

// Mounted only when config.devMail is on (never in production).
export function devMailRoutes({ db }: { db: Db }) {
  return new Hono().get('/', async (c) => {
    const rows = await db.select().from(devMail).orderBy(desc(devMail.id)).limit(50)
    const body: DevMail[] = rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
    return c.json(body)
  })
}
```

- [ ] **Step 5: Подключить к приложению и тестам**

Replace `server/app.ts`:

```ts
import { Hono } from 'hono'
import type { AppConfig } from '../shared/api.ts'
import type { Config } from './config.ts'
import type { Db } from './db/client.ts'
import { AppError, errorResponse } from './errors.ts'
import { devMailRoutes } from './routes/dev-mail.ts'

export interface AppDeps {
  config: Config
  db: Db
}

export function createApp({ config, db }: AppDeps) {
  const app = new Hono()

  app.get('/api/config', (c) => {
    const body: AppConfig = { googleEnabled: config.google !== null, devMail: config.devMail }
    return c.json(body)
  })

  if (config.devMail) app.route('/api/dev/mail', devMailRoutes({ db }))

  app.notFound((c) => errorResponse(c, 'not_found', 404))
  app.onError((err, c) => {
    if (err instanceof AppError) return errorResponse(c, err.code, err.status)
    console.error(err)
    return errorResponse(c, 'server_error', 500)
  })

  return app
}
```

Replace `server/test/helpers.ts`:

```ts
// Test harness: a fresh in-memory database and app per call. Test files call
// createTestApp() in beforeAll and close() in afterAll, and talk to the app
// only through call().
import { and, desc, eq } from 'drizzle-orm'
import { createApp } from '../app.ts'
import { loadConfig } from '../config.ts'
import { openDatabase } from '../db/client.ts'
import { devMail } from '../db/schema.ts'
import { createDevMailer } from '../mail/dev.ts'

export const APP_URL = 'http://localhost:5173'

interface CallOptions {
  method?: string
  body?: unknown
  cookie?: string
  origin?: string | null
  headers?: Record<string, string>
}

export async function createTestApp(options: { env?: Record<string, string> } = {}) {
  const config = loadConfig({ NODE_ENV: 'test', APP_URL, ...options.env })
  const database = await openDatabase()
  const { db } = database
  const mailer = createDevMailer(db, () => {})
  const app = createApp({ config, db })

  // Like a browser on the site: JSON body, Origin of the site, optional cookie.
  async function call(path: string, { method = 'GET', body, cookie, origin = APP_URL, headers = {} }: CallOptions = {}) {
    const h: Record<string, string> = { ...headers }
    if (origin) h.origin = origin
    if (cookie) h.cookie = cookie
    if (body !== undefined) h['content-type'] = 'application/json'
    return app.request(path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) })
  }

  async function lastMail(to: string) {
    const [mail] = await db
      .select()
      .from(devMail)
      .where(eq(devMail.to, to))
      .orderBy(desc(devMail.id))
      .limit(1)
    if (!mail) throw new Error(`No mail to ${to}`)
    return mail
  }

  async function mailCount(to: string, subject?: string) {
    const rows = await db
      .select()
      .from(devMail)
      .where(subject ? and(eq(devMail.to, to), eq(devMail.subject, subject)) : eq(devMail.to, to))
    return rows.length
  }

  // The site link in a mail, e.g. http://localhost:5173/ru/verify-email?token=…
  function linkIn(mail: { text: string }) {
    const match = /https?:\/\/\S+/.exec(mail.text)
    if (!match) throw new Error('No link in mail')
    return new URL(match[0])
  }

  function tokenIn(mail: { text: string }) {
    const token = linkIn(mail).searchParams.get('token')
    if (!token) throw new Error('No token in mail link')
    return token
  }

  return { app, db, mailer, config, call, lastMail, mailCount, linkIn, tokenIn, close: database.close }
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>

export async function json<T = Record<string, unknown>>(res: Response): Promise<T> {
  return (await res.json()) as T
}
```

Replace `server/index.ts`:

```ts
// API server entry. In development scripts/dev.mjs runs it with `node --watch`;
// Node runs the TypeScript directly (type stripping), no build step.
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'
import { openDatabase } from './db/client.ts'

const config = loadConfig()
// Creates .data/pglite on first start and applies pending migrations.
const { db, close } = await openDatabase(config.dataDir)
const app = createApp({ config, db })
const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`[api] http://localhost:${port} (site: ${config.appUrl})`)
})

function shutdown() {
  server.close()
  void close().finally(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

- [ ] **Step 6: Проверить, что тесты проходят**

Run: `npm test -- server`
Expected: PASS.

- [ ] **Step 7: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json server
git commit -m "Add EN/RU mail templates, the dev mailbox and /api/dev/mail" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 5: Better Auth: регистрация, подтверждение, вход, сброс, удаление

Better Auth на `/api/auth/*`: email и пароль от 8 символов, письмо подтверждения на языке страницы, вход без подтверждения, общий `invalid_credentials`, rate limit, cookie на 30 дней, одноразовый сброс на час с отзывом сеансов, удаление аккаунта только с паролем, плагин `admin` (роль `customer` по умолчанию, бан). Ошибки Better Auth переписываются в `{ error: { code } }`.

**Files:**
- Create: `server/auth.ts`, `server/auth-errors.ts`, `server/auth-errors.test.ts`, `server/auth.test.ts`, `server/account.test.ts`
- Modify: `server/app.ts`, `server/test/helpers.ts`, `server/index.ts`, `package.json`

**Interfaces:**
- Consumes: `Config` (Task 2), `Db`, schema (Task 3), `Mailer`, `renderMail`, `siteLink` (Task 4).
- Produces: `createAuth({ config, db, mailer, rateLimit?: boolean /* по умолчанию true */ })`, `type Auth = ReturnType<typeof createAuth>`. Пользователь Better Auth получает поля `locale: 'en' | 'ru'`, `role`, `banned`, `banReason`, `banExpires`.
- Produces: `toErrorCode(status: number, authCode: unknown): ErrorCode`, `rewriteAuthError(response: Response): Promise<Response>`.
- Produces: `AppDeps = { config, db, auth }`; `createTestApp(options?: { rateLimit?: boolean; env?: Record<string, string> })` теперь отдаёт ещё `auth`, `signUp(email, { name?, password?, locale? }) → cookie`, `signIn(email, password?) → { res, cookie }`, `verifyEmail(email, cookie?) → Response`, `verifiedUser(email, { name?, locale? }) → cookie`; экспортируются `PASSWORD` и `mergeCookies(previous, res)`.
- Письма: подтверждение ведёт на `{APP_URL}[/ru]/verify-email?token=…`, сброс — на `{APP_URL}[/ru]/reset-password?token=…&email=…`.

- [ ] **Step 1: Установить зависимость**

```bash
npm install better-auth@1.7.7
```

- [ ] **Step 2: Написать падающие тесты**

Create `server/auth-errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { rewriteAuthError, toErrorCode } from './auth-errors.ts'

describe('toErrorCode', () => {
  it.each([
    [401, 'INVALID_EMAIL_OR_PASSWORD', 'invalid_credentials'],
    [400, 'INVALID_PASSWORD', 'invalid_credentials'],
    [403, 'BANNED_USER', 'account_banned'],
    [403, 'EMAIL_NOT_VERIFIED', 'email_not_verified'],
    [401, 'TOKEN_EXPIRED', 'token_expired'],
    [400, 'INVALID_TOKEN', 'token_invalid'],
    [400, 'PASSWORD_TOO_SHORT', 'weak_password'],
    [422, 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', 'email_taken'],
    [400, 'VALIDATION_ERROR', 'validation_failed'],
    [429, undefined, 'rate_limited'],
    [401, 'SOMETHING_NEW', 'unauthorized'],
    [403, undefined, 'forbidden'],
    [404, undefined, 'not_found'],
    [500, undefined, 'server_error'],
    [400, 'SOMETHING_NEW', 'validation_failed'],
  ])('%s %s → %s', (status, code, expected) => {
    expect(toErrorCode(status, code)).toBe(expected)
  })
})

describe('rewriteAuthError', () => {
  it('keeps successful responses as they are', async () => {
    const ok = Response.json({ user: { id: '1' } })
    expect(await rewriteAuthError(ok)).toBe(ok)
  })

  it('replaces the English message with the code and keeps cookies', async () => {
    const res = new Response(JSON.stringify({ code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' }), {
      status: 401,
      headers: { 'content-type': 'application/json', 'set-cookie': 'a=; Max-Age=0' },
    })
    const out = await rewriteAuthError(res)
    expect(out.status).toBe(401)
    expect(out.headers.get('set-cookie')).toBe('a=; Max-Age=0')
    expect(await out.json()).toEqual({ error: { code: 'invalid_credentials' } })
  })

  it('handles an empty error body', async () => {
    const out = await rewriteAuthError(new Response(null, { status: 429 }))
    expect(await out.json()).toEqual({ error: { code: 'rate_limited' } })
  })
})
```

Create `server/auth.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createEmailVerificationToken } from 'better-auth/api'
import { createTestApp, json, PASSWORD, type TestApp } from './test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

describe('sign-up, confirmation and sign-in', () => {
  it('signs up, mails a confirmation link, confirms and signs in', async () => {
    const cookie = await t.signUp('ann@example.com', { name: 'Ann' })
    expect(cookie).toContain('better-auth.session_token=')

    const session = await json<{ user: { emailVerified: boolean; role: string; locale: string } }>(
      await t.call('/api/auth/get-session', { cookie }),
    )
    expect(session.user).toMatchObject({ emailVerified: false, role: 'customer', locale: 'en' })

    const mail = await t.lastMail('ann@example.com')
    expect(mail.subject).toBe('Confirm your email for LaslesVPN')
    const link = t.linkIn(mail)
    expect(link.origin + link.pathname).toBe('http://localhost:5173/verify-email')

    expect((await t.verifyEmail('ann@example.com')).status).toBe(200)

    const { res, cookie: fresh } = await t.signIn('ann@example.com')
    expect(res.status).toBe(200)
    const after = await json<{ user: { emailVerified: boolean } }>(
      await t.call('/api/auth/get-session', { cookie: fresh }),
    )
    expect(after.user.emailVerified).toBe(true)
  })

  it('writes the confirmation in the language of the sign-up page', async () => {
    await t.signUp('boris@example.com', { name: 'Борис', locale: 'ru' })
    const mail = await t.lastMail('boris@example.com')
    expect(mail.subject).toBe('Подтвердите email для LaslesVPN')
    expect(mail.text).toContain('Здравствуйте, Борис!')
    expect(t.linkIn(mail).pathname).toBe('/ru/verify-email')
  })

  it('ignores an unknown sign-up language', async () => {
    const cookie = await t.signUp('xx@example.com', { locale: 'xx' })
    const session = await json<{ user: { locale: string } }>(await t.call('/api/auth/get-session', { cookie }))
    expect(session.user.locale).toBe('en')
  })

  it('never lets sign-up choose a role', async () => {
    const res = await t.call('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Eve', email: 'eve@example.com', password: PASSWORD, role: 'admin' },
    })
    expect(res.status).toBe(400)
    expect(await json(res)).toEqual({ error: { code: 'validation_failed' } })
  })
})

describe('error codes', () => {
  it('a wrong password and an unknown email give the same invalid_credentials', async () => {
    await t.signUp('carl@example.com')
    for (const [email, password] of [
      ['carl@example.com', 'wrong-password'],
      ['nobody@example.com', PASSWORD],
    ]) {
      const { res } = await t.signIn(email, password)
      expect(res.status).toBe(401)
      expect(await json(res)).toEqual({ error: { code: 'invalid_credentials' } })
    }
  })

  it('a short password is weak_password', async () => {
    const res = await t.call('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Dan', email: 'dan@example.com', password: 'short' },
    })
    expect(res.status).toBe(400)
    expect(await json(res)).toEqual({ error: { code: 'weak_password' } })
  })

  it('a taken email is email_taken', async () => {
    await t.signUp('dup@example.com')
    const res = await t.call('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Dup', email: 'dup@example.com', password: PASSWORD },
    })
    expect(await json(res)).toEqual({ error: { code: 'email_taken' } })
  })

  it('confirmation links: garbage is token_invalid, an old link is token_expired', async () => {
    const bad = await t.call('/api/auth/verify-email?token=not-a-token')
    expect(await json(bad)).toEqual({ error: { code: 'token_invalid' } })

    await t.signUp('late@example.com')
    const expired = await createEmailVerificationToken(t.config.secret, 'late@example.com', undefined, -60)
    const res = await t.call(`/api/auth/verify-email?token=${expired}`)
    expect(await json(res)).toEqual({ error: { code: 'token_expired' } })
  })

  it('error bodies never carry Better Auth English messages', async () => {
    const { res } = await t.signIn('carl@example.com', 'wrong-password')
    expect(Object.keys(await json(res))).toEqual(['error'])
  })
})

describe('rate limiting', () => {
  it('too many sign-in attempts give rate_limited', async () => {
    const limited = await createTestApp({ rateLimit: true })
    try {
      const codes: number[] = []
      for (let i = 0; i < 4; i++) {
        const res = await limited.call('/api/auth/sign-in/email', {
          method: 'POST',
          body: { email: 'x@example.com', password: 'whatever-1' },
          headers: { 'x-forwarded-for': '203.0.113.7' },
        })
        codes.push(res.status)
        if (res.status === 429) expect(await json(res)).toEqual({ error: { code: 'rate_limited' } })
      }
      expect(codes.at(-1)).toBe(429)
    } finally {
      await limited.close()
    }
  })
})

describe('session cookie', () => {
  it('is httpOnly, SameSite=Lax and lasts 30 days; Secure in production', async () => {
    const res = await t.call('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Cookie', email: 'cookie@example.com', password: PASSWORD },
    })
    const cookie = res.headers.getSetCookie().find((c) => c.includes('session_token='))
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Lax/)
    expect(cookie).toMatch(/Max-Age=2592000/)
    expect(cookie).not.toMatch(/Secure/)

    const prod = await createTestApp({ env: { NODE_ENV: 'production', BETTER_AUTH_SECRET: 'p'.repeat(32) } })
    try {
      const prodRes = await prod.call('/api/auth/sign-up/email', {
        method: 'POST',
        body: { name: 'Prod', email: 'prod@example.com', password: PASSWORD },
      })
      const prodCookie = prodRes.headers.getSetCookie().find((c) => c.includes('session_token='))
      expect(prodCookie).toMatch(/^__Secure-/)
      expect(prodCookie).toMatch(/; Secure/)
    } finally {
      await prod.close()
    }
  })
})
```

Create `server/account.test.ts` (Task 7 допишет в него тест переключения языка):

```ts
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { device, payment, preferences, session, subscription, user, verification } from './db/schema.ts'
import { createTestApp, json, PASSWORD, type TestApp } from './test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

async function requestReset(email: string) {
  return t.call('/api/auth/request-password-reset', { method: 'POST', body: { email } })
}

async function resetPassword(token: string, newPassword: string) {
  return t.call('/api/auth/reset-password', { method: 'POST', body: { token, newPassword } })
}

describe('password reset', () => {
  it('answers the same for unknown emails and sends nothing', async () => {
    const res = await requestReset('ghost@example.com')
    expect(res.status).toBe(200)
    expect(await t.mailCount('ghost@example.com')).toBe(0)
  })

  it('mails a one-time link in the user language, signs out everywhere, and the token works once', async () => {
    const oldCookie = await t.verifiedUser('rita@example.com', { locale: 'ru' })
    expect((await requestReset('rita@example.com')).status).toBe(200)

    const mail = await t.lastMail('rita@example.com')
    expect(mail.subject).toBe('Сброс пароля LaslesVPN')
    const link = t.linkIn(mail)
    expect(link.pathname).toBe('/ru/reset-password')
    expect(link.searchParams.get('email')).toBe('rita@example.com')
    const token = t.tokenIn(mail)

    expect((await resetPassword(token, 'brand-new-pass')).status).toBe(200)
    // Every old session is gone.
    expect(await json(await t.call('/api/auth/get-session', { cookie: oldCookie }))).toBeNull()
    // The old password no longer works, the new one does.
    expect((await t.signIn('rita@example.com', PASSWORD)).res.status).toBe(401)
    expect((await t.signIn('rita@example.com', 'brand-new-pass')).res.status).toBe(200)
    // Reusing the same link fails.
    const again = await resetPassword(token, 'another-pass-1')
    expect(again.status).toBe(400)
    expect(await json(again)).toEqual({ error: { code: 'token_invalid' } })
  })

  it('refuses a link older than one hour', async () => {
    await t.verifiedUser('old@example.com')
    await requestReset('old@example.com')
    const token = t.tokenIn(await t.lastMail('old@example.com'))
    const aged = await t.db
      .update(verification)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(verification.identifier, `reset-password:${token}`))
      .returning()
    expect(aged).toHaveLength(1)
    const res = await resetPassword(token, 'brand-new-pass')
    expect(await json(res)).toEqual({ error: { code: 'token_invalid' } })
  })
})

describe('banned users', () => {
  it('cannot sign in', async () => {
    await t.verifiedUser('bob@example.com')
    await t.db.update(user).set({ banned: true }).where(eq(user.email, 'bob@example.com'))

    const { res } = await t.signIn('bob@example.com')
    expect(res.status).toBe(403)
    expect(await json(res)).toEqual({ error: { code: 'account_banned' } })
  })
})

describe('account deletion', () => {
  it('needs the password', async () => {
    const cookie = await t.verifiedUser('keep@example.com')
    const res = await t.call('/api/auth/delete-user', { method: 'POST', body: {}, cookie })
    expect(res.status).toBe(400)
    expect(await json(res)).toEqual({ error: { code: 'validation_failed' } })
    const wrong = await t.call('/api/auth/delete-user', { method: 'POST', body: { password: 'nope-nope' }, cookie })
    expect(await json(wrong)).toEqual({ error: { code: 'invalid_credentials' } })
    expect(await json(await t.call('/api/auth/get-session', { cookie }))).not.toBeNull()
  })

  it('removes the user and every row that belongs to them', async () => {
    const cookie = await t.verifiedUser('gone@example.com')
    const [{ id }] = await t.db.select({ id: user.id }).from(user).where(eq(user.email, 'gone@example.com'))
    await t.db.insert(subscription).values({ userId: id, plan: 'standard', billing: 'monthly' })
    await t.db.insert(device).values({ id: 'DEV-gone', userId: id, name: 'Laptop', platform: 'macos' })
    await t.db.insert(payment).values({
      id: 'INV-GONE',
      userId: id,
      plan: 'standard',
      billing: 'monthly',
      amount: 900,
      cardBrand: 'Visa',
      cardLast4: '4242',
    })
    await t.db.insert(preferences).values({ userId: id, newsletter: true })

    const res = await t.call('/api/auth/delete-user', { method: 'POST', body: { password: PASSWORD }, cookie })
    expect(res.status).toBe(200)

    for (const table of [device, payment, subscription, preferences, session]) {
      expect(await t.db.select().from(table).where(eq(table.userId, id))).toEqual([])
    }
    expect(await t.db.select().from(user).where(eq(user.id, id))).toEqual([])
    expect(await json(await t.call('/api/auth/get-session', { cookie }))).toBeNull()
  })
})
```

Replace `server/test/helpers.ts` (полная версия; Task 13 добавит в конец только `totp`):

```ts
// Test harness: a fresh in-memory database and app per call. Test files call
// createTestApp() in beforeAll and close() in afterAll, and talk to the app
// only through call().
import { and, desc, eq } from 'drizzle-orm'
import { createApp } from '../app.ts'
import { createAuth } from '../auth.ts'
import { loadConfig } from '../config.ts'
import { openDatabase } from '../db/client.ts'
import { devMail } from '../db/schema.ts'
import { createDevMailer } from '../mail/dev.ts'

export const APP_URL = 'http://localhost:5173'
export const PASSWORD = 'correct-horse-1'

interface CallOptions {
  method?: string
  body?: unknown
  cookie?: string
  origin?: string | null
  headers?: Record<string, string>
}

// Merges the Set-Cookie headers of a response into a Cookie header value.
export function mergeCookies(previous: string, res: Response): string {
  const jar = new Map(
    previous
      .split('; ')
      .filter(Boolean)
      .map((pair) => [pair.slice(0, pair.indexOf('=')), pair] as const),
  )
  for (const header of res.headers.getSetCookie()) {
    const pair = header.split(';')[0]
    const name = pair.slice(0, pair.indexOf('='))
    if (/max-age=0/i.test(header) || pair.endsWith('=')) jar.delete(name)
    else jar.set(name, pair)
  }
  return [...jar.values()].join('; ')
}

export async function createTestApp(options: { rateLimit?: boolean; env?: Record<string, string> } = {}) {
  const config = loadConfig({ NODE_ENV: 'test', APP_URL, ...options.env })
  const database = await openDatabase()
  const { db } = database
  const mailer = createDevMailer(db, () => {})
  const auth = createAuth({ config, db, mailer, rateLimit: options.rateLimit ?? false })
  const app = createApp({ config, db, auth })

  // Like a browser on the site: JSON body, Origin of the site, optional cookie.
  async function call(path: string, { method = 'GET', body, cookie, origin = APP_URL, headers = {} }: CallOptions = {}) {
    const h: Record<string, string> = { ...headers }
    if (origin) h.origin = origin
    if (cookie) h.cookie = cookie
    if (body !== undefined) h['content-type'] = 'application/json'
    return app.request(path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) })
  }

  async function lastMail(to: string) {
    const [mail] = await db
      .select()
      .from(devMail)
      .where(eq(devMail.to, to))
      .orderBy(desc(devMail.id))
      .limit(1)
    if (!mail) throw new Error(`No mail to ${to}`)
    return mail
  }

  async function mailCount(to: string, subject?: string) {
    const rows = await db
      .select()
      .from(devMail)
      .where(subject ? and(eq(devMail.to, to), eq(devMail.subject, subject)) : eq(devMail.to, to))
    return rows.length
  }

  // The site link in a mail, e.g. http://localhost:5173/ru/verify-email?token=…
  function linkIn(mail: { text: string }) {
    const match = /https?:\/\/\S+/.exec(mail.text)
    if (!match) throw new Error('No link in mail')
    return new URL(match[0])
  }

  function tokenIn(mail: { text: string }) {
    const token = linkIn(mail).searchParams.get('token')
    if (!token) throw new Error('No token in mail link')
    return token
  }

  async function signUp(email: string, opts: { name?: string; password?: string; locale?: string } = {}) {
    const res = await call('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: opts.name ?? 'Test User', email, password: opts.password ?? PASSWORD, locale: opts.locale ?? 'en' },
    })
    if (res.status !== 200) throw new Error(`sign-up failed: ${res.status} ${await res.text()}`)
    return mergeCookies('', res)
  }

  async function signIn(email: string, password = PASSWORD) {
    const res = await call('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
    return { res, cookie: mergeCookies('', res) }
  }

  async function verifyEmail(email: string, cookie?: string) {
    const token = tokenIn(await lastMail(email))
    return call(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { cookie })
  }

  // A signed-in customer with a confirmed email: the common starting point.
  async function verifiedUser(email: string, opts: { name?: string; locale?: string } = {}) {
    const cookie = await signUp(email, opts)
    const res = await verifyEmail(email, cookie)
    if (res.status !== 200) throw new Error(`verify failed: ${res.status}`)
    return cookie
  }

  return {
    app,
    auth,
    db,
    mailer,
    config,
    call,
    lastMail,
    mailCount,
    linkIn,
    tokenIn,
    signUp,
    signIn,
    verifyEmail,
    verifiedUser,
    close: database.close,
  }
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>

export async function json<T = Record<string, unknown>>(res: Response): Promise<T> {
  return (await res.json()) as T
}
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `npm test -- server`
Expected: FAIL — нет модулей `../auth.ts` и `./auth-errors.ts`.

- [ ] **Step 4: Перевод ошибок Better Auth**

Create `server/auth-errors.ts`:

```ts
import type { ErrorCode } from '../shared/api.ts'

// Better Auth error codes → the site's error codes. Anything not listed falls
// back by HTTP status (see toErrorCode).
const byAuthCode: Record<string, ErrorCode> = {
  INVALID_EMAIL_OR_PASSWORD: 'invalid_credentials',
  INVALID_PASSWORD: 'invalid_credentials',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'invalid_credentials',
  INVALID_CODE: 'invalid_credentials',
  INVALID_BACKUP_CODE: 'invalid_credentials',
  EMAIL_NOT_VERIFIED: 'email_not_verified',
  BANNED_USER: 'account_banned',
  TOKEN_EXPIRED: 'token_expired',
  INVALID_TOKEN: 'token_invalid',
  USER_NOT_FOUND: 'token_invalid',
  INVALID_USER: 'token_invalid',
  PASSWORD_TOO_SHORT: 'weak_password',
  PASSWORD_TOO_LONG: 'weak_password',
  USER_ALREADY_EXISTS: 'email_taken',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'email_taken',
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: 'rate_limited',
  ACCOUNT_TEMPORARILY_LOCKED: 'rate_limited',
  INVALID_TWO_FACTOR_COOKIE: 'unauthorized',
  SESSION_EXPIRED: 'unauthorized',
  VALIDATION_ERROR: 'validation_failed',
}

export function toErrorCode(status: number, authCode: unknown): ErrorCode {
  if (typeof authCode === 'string' && byAuthCode[authCode]) return byAuthCode[authCode]
  if (status === 429) return 'rate_limited'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status >= 500) return 'server_error'
  return 'validation_failed'
}

// Rewrites a Better Auth error response so the browser only ever sees
// { error: { code } }, never Better Auth's English messages. Cookies and
// other headers are kept; successful responses pass through untouched.
export async function rewriteAuthError(response: Response): Promise<Response> {
  if (response.status < 400) return response
  let authCode: unknown
  try {
    authCode = ((await response.clone().json()) as { code?: unknown }).code
  } catch {
    authCode = undefined
  }
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.set('content-type', 'application/json')
  return new Response(JSON.stringify({ error: { code: toErrorCode(response.status, authCode) } }), {
    status: response.status,
    headers,
  })
}
```

- [ ] **Step 5: Better Auth**

Create `server/auth.ts`:

```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { admin } from 'better-auth/plugins'
import { adminAc, userAc } from 'better-auth/plugins/admin/access'
import type { UserLocale } from '../shared/api.ts'
import type { Config } from './config.ts'
import type { Db } from './db/client.ts'
import * as schema from './db/schema.ts'
import { renderMail, siteLink, type MailKind } from './mail/templates.ts'
import type { Mailer } from './mail/types.ts'

export interface AuthDeps {
  config: Config
  db: Db
  mailer: Mailer
  // Off in tests unless a test is about rate limiting.
  rateLimit?: boolean
}

function userLocale(user: object): UserLocale {
  return 'locale' in user && user.locale === 'ru' ? 'ru' : 'en'
}

const THIRTY_DAYS = 60 * 60 * 24 * 30

export function createAuth({ config, db, mailer, rateLimit = true }: AuthDeps) {
  async function sendMail(
    kind: MailKind,
    user: { email: string; name: string },
    path: string,
    params: Record<string, string>,
  ) {
    const locale = userLocale(user)
    const url = siteLink(config.appUrl, locale, path, params)
    await mailer.send(renderMail(kind, locale, { to: user.email, name: user.name, url }))
  }

  return betterAuth({
    appName: 'LaslesVPN',
    baseURL: config.appUrl,
    basePath: '/api/auth',
    secret: config.secret,
    trustedOrigins: [config.appUrl],
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        await sendMail('resetPassword', user, '/reset-password', { token, email: user.email })
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, token }) => {
        await sendMail('verifyEmail', user, '/verify-email', { token })
      },
    },
    user: {
      additionalFields: {
        locale: { type: ['en', 'ru'], required: false, defaultValue: 'en', input: true },
      },
      deleteUser: { enabled: true },
    },
    session: { expiresIn: THIRTY_DAYS },
    rateLimit: {
      enabled: rateLimit,
      window: 60,
      max: 100,
    },
    advanced: {
      // Better Auth skips its Origin and callback-URL checks under test by
      // default; keep them on so the tests see what the browser gets.
      disableOriginCheck: false,
      useSecureCookies: config.isProduction,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
      ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
    },
    databaseHooks: {
      user: {
        create: {
          // Sign-up may only pick a language; anything else falls back to English.
          before: async (user) => ({ data: { ...user, locale: userLocale(user) } }),
        },
      },
    },
    hooks: {
      // Deleting an account always needs the password, not just a fresh session.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/delete-user' && !(ctx.body as { password?: unknown } | undefined)?.password) {
          throw new APIError('BAD_REQUEST', { code: 'VALIDATION_ERROR', message: 'password required' })
        }
      }),
    },
    plugins: [
      admin({
        roles: { customer: userAc, admin: adminAc, support: userAc, finance: userAc },
        defaultRole: 'customer',
        adminRoles: ['admin'],
      }),
    ],
    telemetry: { enabled: false },
  })
}

export type Auth = ReturnType<typeof createAuth>
```

Почему так:
- `requireEmailVerification: false` и `sendOnSignUp: true` — войти можно сразу, письмо уходит всё равно (spec, сценарий 1).
- `revokeSessionsOnPasswordReset: true` и `resetPasswordTokenExpiresIn: 3600` — сценарий 4. Одноразовость Better Auth обеспечивает сам: `consumeVerificationValue` удаляет токен.
- `roles` у плагина `admin` перечисляет все роли spec, иначе Better Auth не примет `adminRoles`. Права `support` и `finance` уточнит подпроект 2.
- `ipAddressHeaders: ['x-forwarded-for']` — IP для rate limit (прокси Vite ставит заголовок, Task 2).

- [ ] **Step 6: Подключить к приложению**

Replace `server/app.ts`:

```ts
import { Hono } from 'hono'
import type { AppConfig } from '../shared/api.ts'
import { rewriteAuthError } from './auth-errors.ts'
import type { Auth } from './auth.ts'
import type { Config } from './config.ts'
import type { Db } from './db/client.ts'
import { AppError, errorResponse } from './errors.ts'
import { devMailRoutes } from './routes/dev-mail.ts'

export interface AppDeps {
  config: Config
  db: Db
  auth: Auth
}

export function createApp({ config, db, auth }: AppDeps) {
  const app = new Hono()

  app.get('/api/config', (c) => {
    const body: AppConfig = { googleEnabled: config.google !== null, devMail: config.devMail }
    return c.json(body)
  })

  // Better Auth answers everything under /api/auth; its errors are reduced to { error: { code } }.
  app.on(['GET', 'POST'], '/api/auth/*', async (c) => rewriteAuthError(await auth.handler(c.req.raw)))

  if (config.devMail) app.route('/api/dev/mail', devMailRoutes({ db }))

  app.notFound((c) => errorResponse(c, 'not_found', 404))
  app.onError((err, c) => {
    if (err instanceof AppError) return errorResponse(c, err.code, err.status)
    console.error(err)
    return errorResponse(c, 'server_error', 500)
  })

  return app
}
```

Replace `server/index.ts`:

```ts
// API server entry. In development scripts/dev.mjs runs it with `node --watch`;
// Node runs the TypeScript directly (type stripping), no build step.
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { createAuth } from './auth.ts'
import { loadConfig } from './config.ts'
import { openDatabase } from './db/client.ts'
import { createDevMailer } from './mail/dev.ts'
import { createSmtpMailer } from './mail/smtp.ts'

const config = loadConfig()
// Creates .data/pglite on first start and applies pending migrations.
const { db, close } = await openDatabase(config.dataDir)
// Without SMTP_HOST mail stays local: /dev/mail and the console.
const mailer = config.smtp ? createSmtpMailer(config.smtp) : createDevMailer(db)
const auth = createAuth({ config, db, mailer })
const app = createApp({ config, db, auth })
const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`[api] http://localhost:${port} (site: ${config.appUrl})`)
})

function shutdown() {
  server.close()
  void close().finally(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

- [ ] **Step 7: Проверить, что тесты проходят**

Run: `npm test -- server`
Expected: PASS. Предупреждение Better Auth про IP в выводе тестов допустимо: в тестах нет прокси.

- [ ] **Step 8: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json server
git commit -m "Add Better Auth: sign-up, email confirmation, sign-in, reset and deletion" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 6: Защита эндпоинтов, сид и запуск

`requireUser` (сессия, бан), `requireRole(...roles)`, проверка `Origin` для изменяющих запросов, сид администратора и демо-клиента при старте, `npm run db:reset`.

**Files:**
- Create: `server/middleware.ts`, `server/middleware.test.ts`, `server/db/seed.ts`, `server/db/seed.test.ts`, `server/db/reset.ts`
- Modify: `server/app.ts`, `server/index.ts`, `package.json`

**Interfaces:**
- Consumes: `Auth` (Task 5), `errorResponse` (Task 2), `Role` (Task 1).
- Produces: `interface AppEnv { Variables: { user: SessionUser; session } }`, `type SessionUser`; `checkOrigin(appUrl)`; `requireUser(auth)` (нет сессии → 401 `unauthorized`, бан → 403 `account_banned`); `requireRole(...roles: Role[])` (после `requireUser`; чужая роль → 403 `forbidden`).
- Produces: `ADMIN_EMAIL = 'admin@laslesvpn.test'`, `DEMO_EMAIL = 'demo@laslesvpn.test'`, `seed(db, auth, passwords): Promise<boolean>` (`false`, если сид уже был).

- [ ] **Step 1: Написать падающие тесты**

Create `server/middleware.test.ts`:

```ts
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { user } from './db/schema.ts'
import { requireRole, requireUser, type AppEnv } from './middleware.ts'
import { APP_URL, createTestApp, json, type TestApp } from './test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

// A tiny app behind the guards, the way staff pages will use them.
function staffOnly() {
  return new Hono<AppEnv>().get('/staff', requireUser(t.auth), requireRole('admin', 'support'), (c) =>
    c.json({ role: c.get('user').role }),
  )
}

describe('requireUser', () => {
  it('without a session it is 401 unauthorized', async () => {
    const res = await staffOnly().request('/staff')
    expect(res.status).toBe(401)
    expect(await json(res)).toEqual({ error: { code: 'unauthorized' } })
  })

  it('a banned user is stopped even with a session that is still alive', async () => {
    const cookie = await t.verifiedUser('banned@example.com')
    await t.db.update(user).set({ role: 'admin', banned: true }).where(eq(user.email, 'banned@example.com'))
    const res = await staffOnly().request('/staff', { headers: { cookie } })
    expect(res.status).toBe(403)
    expect(await json(res)).toEqual({ error: { code: 'account_banned' } })
  })
})

describe('requireRole', () => {
  it('turns a customer away with 403 forbidden', async () => {
    const cookie = await t.verifiedUser('cust@example.com')
    const res = await staffOnly().request('/staff', { headers: { cookie } })
    expect(res.status).toBe(403)
    expect(await json(res)).toEqual({ error: { code: 'forbidden' } })
  })

  it('lets a listed role through', async () => {
    const cookie = await t.verifiedUser('staff@example.com')
    await t.db.update(user).set({ role: 'support' }).where(eq(user.email, 'staff@example.com'))
    const res = await staffOnly().request('/staff', { headers: { cookie } })
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ role: 'support' })
  })
})

describe('Origin check', () => {
  it('rejects changing requests from another origin or without one', async () => {
    for (const origin of ['https://evil.example', 'http://localhost:5174', null]) {
      const res = await t.call('/api/auth/sign-out', { method: 'POST', origin, body: {} })
      expect(res.status).toBe(403)
      expect(await json(res)).toEqual({ error: { code: 'forbidden' } })
    }
  })

  it('lets the site itself through', async () => {
    const res = await t.call('/api/auth/sign-out', { method: 'POST', origin: APP_URL, body: {} })
    expect(res.status).toBe(200)
  })

  it('lets reads through without an Origin header', async () => {
    const res = await t.call('/api/config', { origin: null })
    expect(res.status).toBe(200)
  })
})
```

Create `server/db/seed.test.ts`:

```ts
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createTestApp, json, type TestApp } from '../test/helpers.ts'
import { device, payment, subscription, user } from './schema.ts'
import { ADMIN_EMAIL, DEMO_EMAIL, seed } from './seed.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

it('creates the admin and the demo customer once, with confirmed emails and no mail', async () => {
  expect(await seed(t.db, t.auth, t.config.seed)).toBe(true)
  expect(await seed(t.db, t.auth, t.config.seed)).toBe(false)
  expect(await t.db.select().from(user)).toHaveLength(2)
  expect(await t.mailCount(ADMIN_EMAIL)).toBe(0)

  const admin = await t.signIn(ADMIN_EMAIL, t.config.seed.adminPassword)
  expect(admin.res.status).toBe(200)
  const session = await json<{ user: { role: string; emailVerified: boolean } }>(
    await t.call('/api/auth/get-session', { cookie: admin.cookie }),
  )
  expect(session.user).toMatchObject({ role: 'admin', emailVerified: true })

  const demo = await t.signIn(DEMO_EMAIL, t.config.seed.demoPassword)
  expect(demo.res.status).toBe(200)
  const [demoUser] = await t.db.select().from(user).where(eq(user.email, DEMO_EMAIL))
  expect(demoUser).toMatchObject({ role: 'customer', emailVerified: true })
  const [sub] = await t.db.select().from(subscription).where(eq(subscription.userId, demoUser.id))
  expect(sub).toMatchObject({ plan: 'standard', billing: 'monthly', status: 'active' })
  expect(await t.db.select().from(device).where(eq(device.userId, demoUser.id))).toHaveLength(2)
  const payments = await t.db.select().from(payment).where(eq(payment.userId, demoUser.id))
  expect(payments.map((p) => p.amount)).toEqual([900, 900, 900])
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test -- server/middleware.test.ts server/db/seed.test.ts`
Expected: FAIL — нет модулей `./middleware.ts` и `./seed.ts`.

- [ ] **Step 3: Middleware**

Create `server/middleware.ts`:

```ts
import { createMiddleware } from 'hono/factory'
import type { Role } from '../shared/api.ts'
import type { Auth } from './auth.ts'
import { errorResponse } from './errors.ts'

type Session = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>
export type SessionUser = Session['user']

export interface AppEnv {
  Variables: {
    user: SessionUser
    session: Session['session']
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// Changing requests must come from the site itself (CSRF guard on top of SameSite=Lax).
export function checkOrigin(appUrl: string) {
  return createMiddleware(async (c, next) => {
    if (!SAFE_METHODS.has(c.req.method) && c.req.header('origin') !== appUrl) {
      return errorResponse(c, 'forbidden', 403)
    }
    await next()
  })
}

// Loads the signed-in user from the session cookie. A banned user is
// stopped here even if an old session is still alive.
export function requireUser(auth: Auth) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const result = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!result) return errorResponse(c, 'unauthorized', 401)
    if (result.user.banned) return errorResponse(c, 'account_banned', 403)
    c.set('user', result.user)
    c.set('session', result.session)
    await next()
  })
}

// Use after requireUser: lets only the listed staff roles through.
export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!roles.includes(c.get('user').role as Role)) return errorResponse(c, 'forbidden', 403)
    await next()
  })
}
```

Replace `server/app.ts`:

```ts
import { Hono } from 'hono'
import type { AppConfig } from '../shared/api.ts'
import { rewriteAuthError } from './auth-errors.ts'
import type { Auth } from './auth.ts'
import type { Config } from './config.ts'
import type { Db } from './db/client.ts'
import { AppError, errorResponse } from './errors.ts'
import { checkOrigin } from './middleware.ts'
import { devMailRoutes } from './routes/dev-mail.ts'

export interface AppDeps {
  config: Config
  db: Db
  auth: Auth
}

export function createApp({ config, db, auth }: AppDeps) {
  const app = new Hono()

  // Changing requests must come from the site itself.
  app.use('/api/*', checkOrigin(config.appUrl))

  app.get('/api/config', (c) => {
    const body: AppConfig = { googleEnabled: config.google !== null, devMail: config.devMail }
    return c.json(body)
  })

  // Better Auth answers everything under /api/auth; its errors are reduced to { error: { code } }.
  app.on(['GET', 'POST'], '/api/auth/*', async (c) => rewriteAuthError(await auth.handler(c.req.raw)))

  if (config.devMail) app.route('/api/dev/mail', devMailRoutes({ db }))

  app.notFound((c) => errorResponse(c, 'not_found', 404))
  app.onError((err, c) => {
    if (err instanceof AppError) return errorResponse(c, err.code, err.status)
    console.error(err)
    return errorResponse(c, 'server_error', 500)
  })

  return app
}
```

- [ ] **Step 4: Сид и сброс базы**

Create `server/db/seed.ts`:

```ts
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
export async function seed(db: Db, auth: Auth, passwords: Config['seed']) {
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
```

Create `server/db/reset.ts`:

```ts
// `npm run db:reset`: deletes the local database; the next start of the API
// recreates it, applies migrations and seeds it again.
import { rmSync } from 'node:fs'
import { loadConfig } from '../config.ts'

const { dataDir } = loadConfig()
rmSync(dataDir, { recursive: true, force: true })
console.log(`[db] removed ${dataDir}; start the API to recreate and seed it`)
```

Replace `server/index.ts`:

```ts
// API server entry. In development scripts/dev.mjs runs it with `node --watch`;
// Node runs the TypeScript directly (type stripping), no build step.
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { createAuth } from './auth.ts'
import { loadConfig } from './config.ts'
import { openDatabase } from './db/client.ts'
import { seed } from './db/seed.ts'
import { createDevMailer } from './mail/dev.ts'
import { createSmtpMailer } from './mail/smtp.ts'

const config = loadConfig()
// Creates .data/pglite on first start and applies pending migrations.
const { db, close } = await openDatabase(config.dataDir)
// Without SMTP_HOST mail stays local: /dev/mail and the console.
const mailer = config.smtp ? createSmtpMailer(config.smtp) : createDevMailer(db)
const auth = createAuth({ config, db, mailer })
if (await seed(db, auth, config.seed)) console.log('[db] seeded admin@laslesvpn.test and demo@laslesvpn.test')
const app = createApp({ config, db, auth })
const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`[api] http://localhost:${port} (site: ${config.appUrl})`)
})

function shutdown() {
  server.close()
  void close().finally(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

```bash
npm pkg set scripts.db:reset="node --env-file-if-exists=.env server/db/reset.ts"
```

- [ ] **Step 5: Проверить, что тесты проходят**

Run: `npm test -- server`
Expected: PASS.

- [ ] **Step 6: Ручная проверка**

Run: `npm run db:reset && npm run dev`
Expected: в консоли `[db] seeded admin@laslesvpn.test and demo@laslesvpn.test`; повторный старт без `db:reset` этой строки не пишет. Затем:

```bash
curl -s -X POST http://localhost:5173/api/auth/sign-in/email -H 'content-type: application/json' -H 'origin: http://localhost:5173' -d '{"email":"demo@laslesvpn.test","password":"demo-password"}' -o /dev/null -w '%{http_code}\n'
curl -s -X POST http://localhost:5173/api/auth/sign-in/email -H 'content-type: application/json' -H 'origin: http://evil.example' -d '{}'
```

Expected: `200`, затем `{"error":{"code":"forbidden"}}`.

- [ ] **Step 7: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 8: Commit**

```bash
git add package.json server
git commit -m "Guard the API with session, role and Origin checks; seed demo accounts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 7: `/api/me`: профиль, устройства, платежи, настройки, отмена подписки

Все эндпоинты кабинета. Каждый запрос фильтруется по `c.get('user').id`, поэтому чужие данные недоступны в принципе.

**Files:**
- Create: `server/routes/serialize.ts`, `server/routes/me.ts`, `server/routes/me.test.ts`
- Modify: `server/app.ts`, `server/account.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `AppEnv`, `SessionUser` (Task 6); `readBody`, `AppError` (Task 2); `deviceLimit` (Task 1).
- Produces (HTTP):
  - `GET /api/me` → `Me`; `PATCH /api/me` `{ name?, locale? }` → `Me`
  - `PATCH /api/me/preferences` `{ autoConnect?, killSwitch?, newsletter? }` → `Preferences`
  - `POST /api/me/subscription/cancel` → `Subscription` (нет платного активного тарифа → 404 `not_found`)
  - `GET /api/me/devices` → `Device[]` (старые первыми); `POST /api/me/devices` `{ name, platform }` → 201 `Device` (лимит → 409 `device_limit`); `DELETE /api/me/devices/:id` → 204 (чужое или несуществующее → 404 `not_found`)
  - `GET /api/me/payments` → `Payment[]` (новые первыми)
- Produces: `toSubscription(row, now?)`, `toProfile(user)`, `toDevice`, `toPayment`, `toPreferences`, `defaultPreferences`, `meRoutes({ db, auth })`.

- [ ] **Step 1: Написать падающие тесты**

Create `server/routes/me.test.ts`:

```ts
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Device, Me, Preferences, Subscription } from '../../shared/api.ts'
import { subscription, user } from '../db/schema.ts'
import { createTestApp, json, type TestApp } from '../test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

// Puts the user on a paid plan directly; buying one is /api/checkout's job (Task 8).
async function givePlan(email: string, plan: 'standard' | 'premium') {
  const [{ id }] = await t.db.select({ id: user.id }).from(user).where(eq(user.email, email))
  const renewsAt = new Date(Date.now() + 30 * 24 * 3600 * 1000)
  await t.db.insert(subscription).values({ userId: id, plan, billing: 'monthly', renewsAt })
  return id
}

describe('/api/me', () => {
  it('needs a session', async () => {
    const res = await t.call('/api/me')
    expect(res.status).toBe(401)
    expect(await json(res)).toEqual({ error: { code: 'unauthorized' } })
  })

  it('returns the profile, no plan yet and default preferences', async () => {
    const cookie = await t.signUp('me@example.com', { name: 'Mia' })
    const me = await json<Me>(await t.call('/api/me', { cookie }))
    expect(me.user).toMatchObject({ name: 'Mia', email: 'me@example.com', role: 'customer', twoFactorEnabled: false })
    expect(me.subscription).toBeNull()
    expect(me.preferences).toEqual({ autoConnect: false, killSwitch: true, newsletter: false })
  })

  it('PATCH changes the name and the language, and validates both', async () => {
    const cookie = await t.signUp('patch@example.com')
    const me = await json<Me>(await t.call('/api/me', { method: 'PATCH', cookie, body: { name: ' Pat ', locale: 'ru' } }))
    expect(me.user).toMatchObject({ name: 'Pat', locale: 'ru' })
    for (const body of [{ locale: 'de' }, { name: '' }, {}]) {
      const res = await t.call('/api/me', { method: 'PATCH', cookie, body })
      expect(await json(res)).toEqual({ error: { code: 'validation_failed' } })
    }
  })

  it('PATCH /preferences saves only the given switches', async () => {
    const cookie = await t.signUp('prefs@example.com')
    const prefs = await json<Preferences>(
      await t.call('/api/me/preferences', { method: 'PATCH', cookie, body: { autoConnect: true } }),
    )
    expect(prefs).toEqual({ autoConnect: true, killSwitch: true, newsletter: false })
    const again = await json<Preferences>(
      await t.call('/api/me/preferences', { method: 'PATCH', cookie, body: { killSwitch: false } }),
    )
    expect(again).toEqual({ autoConnect: true, killSwitch: false, newsletter: false })
  })
})

describe('/api/me/devices', () => {
  it('allows one device without a plan and answers device_limit after that', async () => {
    const cookie = await t.signUp('dev1@example.com')
    const first = await t.call('/api/me/devices', { method: 'POST', cookie, body: { name: 'Phone', platform: 'ios' } })
    expect(first.status).toBe(201)
    const second = await t.call('/api/me/devices', { method: 'POST', cookie, body: { name: 'Mac', platform: 'macos' } })
    expect(second.status).toBe(409)
    expect(await json(second)).toEqual({ error: { code: 'device_limit' } })
  })

  it('follows the plan limit', async () => {
    const cookie = await t.verifiedUser('dev3@example.com')
    await givePlan('dev3@example.com', 'standard')
    for (const name of ['A', 'B', 'C']) {
      const res = await t.call('/api/me/devices', { method: 'POST', cookie, body: { name, platform: 'linux' } })
      expect(res.status).toBe(201)
    }
    const fourth = await t.call('/api/me/devices', { method: 'POST', cookie, body: { name: 'D', platform: 'linux' } })
    expect(await json(fourth)).toEqual({ error: { code: 'device_limit' } })
    const list = await json<Device[]>(await t.call('/api/me/devices', { cookie }))
    expect(list.map((d) => d.name)).toEqual(['A', 'B', 'C'])
  })

  it("someone else's device is not_found, and stays", async () => {
    const owner = await t.signUp('owner@example.com')
    const other = await t.signUp('other@example.com')
    const created = await json<Device>(
      await t.call('/api/me/devices', { method: 'POST', cookie: owner, body: { name: 'Mine', platform: 'windows' } }),
    )
    const res = await t.call(`/api/me/devices/${created.id}`, { method: 'DELETE', cookie: other })
    expect(res.status).toBe(404)
    expect(await json(res)).toEqual({ error: { code: 'not_found' } })
    expect(await json<Device[]>(await t.call('/api/me/devices', { cookie: other }))).toEqual([])
    expect(await json<Device[]>(await t.call('/api/me/devices', { cookie: owner }))).toHaveLength(1)

    const own = await t.call(`/api/me/devices/${created.id}`, { method: 'DELETE', cookie: owner })
    expect(own.status).toBe(204)
  })

  it('rejects unknown platforms and empty names', async () => {
    const cookie = await t.signUp('badDevice@example.com')
    for (const body of [{ name: 'X', platform: 'symbian' }, { name: '   ', platform: 'ios' }]) {
      const res = await t.call('/api/me/devices', { method: 'POST', cookie, body })
      expect(await json(res)).toEqual({ error: { code: 'validation_failed' } })
    }
  })
})

describe('/api/me/subscription/cancel', () => {
  it('keeps the plan until the period ends, then the account is free', async () => {
    const cookie = await t.verifiedUser('cancel@example.com')
    const id = await givePlan('cancel@example.com', 'premium')

    const res = await t.call('/api/me/subscription/cancel', { method: 'POST', cookie })
    const sub = await json<Subscription>(res)
    expect(sub).toMatchObject({ plan: 'premium', status: 'canceled' })
    expect(sub.renewsAt).not.toBeNull()

    const again = await t.call('/api/me/subscription/cancel', { method: 'POST', cookie })
    expect(await json(again)).toEqual({ error: { code: 'not_found' } })

    await t.db.update(subscription).set({ renewsAt: new Date(Date.now() - 1000) }).where(eq(subscription.userId, id))
    const me = await json<Me>(await t.call('/api/me', { cookie }))
    expect(me.subscription).toMatchObject({ plan: 'free', billing: null, status: 'canceled', renewsAt: null })
  })

  it('there is nothing to cancel without a paid plan', async () => {
    const cookie = await t.signUp('nothing@example.com')
    const res = await t.call('/api/me/subscription/cancel', { method: 'POST', cookie })
    expect(await json(res)).toEqual({ error: { code: 'not_found' } })
  })
})
```

В `server/account.test.ts` в блок `describe('password reset', …)` перед тестом `refuses a link older than one hour` добавить:

```ts
  it('follows the language the user switched to after sign-up', async () => {
    const cookie = await t.verifiedUser('switch@example.com', { locale: 'en' })
    await t.call('/api/me', { method: 'PATCH', cookie, body: { locale: 'ru' } })
    await requestReset('switch@example.com')
    const mail = await t.lastMail('switch@example.com')
    expect(mail.subject).toBe('Сброс пароля LaslesVPN')
    expect(t.linkIn(mail).pathname).toBe('/ru/reset-password')
  })
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test -- server/routes/me.test.ts server/account.test.ts`
Expected: FAIL — `/api/me` отвечает 404 `not_found`.

- [ ] **Step 3: Реализовать**

Create `server/routes/serialize.ts`:

```ts
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
```

Create `server/routes/me.ts`:

```ts
import { randomUUID } from 'node:crypto'
import { and, count, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import * as z from 'zod'
import { locales, platformIds, type Me } from '../../shared/api.ts'
import { deviceLimit } from '../../shared/plans.ts'
import type { Auth } from '../auth.ts'
import type { Db } from '../db/client.ts'
import { device, payment, preferences, subscription, user } from '../db/schema.ts'
import { AppError, readBody } from '../errors.ts'
import { requireUser, type AppEnv } from '../middleware.ts'
import { defaultPreferences, toDevice, toPayment, toPreferences, toProfile, toSubscription } from './serialize.ts'

const profilePatch = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    locale: z.enum(locales).optional(),
  })
  .refine((v) => v.name !== undefined || v.locale !== undefined)

const preferencesPatch = z
  .object({
    autoConnect: z.boolean().optional(),
    killSwitch: z.boolean().optional(),
    newsletter: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0)

const newDevice = z.object({
  name: z.string().trim().min(1).max(40),
  platform: z.enum(platformIds),
})

// Everything under /api/me works only on the signed-in user's own rows:
// every query below is filtered by c.get('user').id.
export function meRoutes({ db, auth }: { db: Db; auth: Auth }) {
  async function loadSubscription(userId: string) {
    const [row] = await db.select().from(subscription).where(eq(subscription.userId, userId))
    return row ? toSubscription(row) : null
  }

  async function loadMe(userId: string, profile: Me['user']): Promise<Me> {
    const [prefs] = await db.select().from(preferences).where(eq(preferences.userId, userId))
    return { user: profile, subscription: await loadSubscription(userId), preferences: toPreferences(prefs) }
  }

  return new Hono<AppEnv>()
    .use(requireUser(auth))
    .get('/', async (c) => c.json(await loadMe(c.get('user').id, toProfile(c.get('user')))))
    .patch('/', async (c) => {
      const patch = await readBody(c, profilePatch)
      const [updated] = await db.update(user).set(patch).where(eq(user.id, c.get('user').id)).returning()
      return c.json(await loadMe(updated.id, toProfile({ ...c.get('user'), ...updated })))
    })
    .patch('/preferences', async (c) => {
      const patch = await readBody(c, preferencesPatch)
      const userId = c.get('user').id
      const [row] = await db
        .insert(preferences)
        .values({ ...defaultPreferences, ...patch, userId })
        .onConflictDoUpdate({ target: preferences.userId, set: patch })
        .returning()
      return c.json(toPreferences(row))
    })
    .post('/subscription/cancel', async (c) => {
      const userId = c.get('user').id
      const current = await loadSubscription(userId)
      if (!current || current.plan === 'free' || current.status === 'canceled') throw new AppError('not_found', 404)
      const [row] = await db
        .update(subscription)
        .set({ status: 'canceled' })
        .where(eq(subscription.userId, userId))
        .returning()
      return c.json(toSubscription(row))
    })
    .get('/devices', async (c) => {
      const rows = await db
        .select()
        .from(device)
        .where(eq(device.userId, c.get('user').id))
        .orderBy(device.createdAt)
      return c.json(rows.map(toDevice))
    })
    .post('/devices', async (c) => {
      const body = await readBody(c, newDevice)
      const userId = c.get('user').id
      const sub = await loadSubscription(userId)
      const [{ used }] = await db.select({ used: count() }).from(device).where(eq(device.userId, userId))
      if (used >= deviceLimit(sub?.plan)) throw new AppError('device_limit', 409)
      const [row] = await db
        .insert(device)
        .values({ id: `DEV-${randomUUID()}`, userId, ...body })
        .returning()
      return c.json(toDevice(row), 201)
    })
    .delete('/devices/:id', async (c) => {
      const deleted = await db
        .delete(device)
        .where(and(eq(device.id, c.req.param('id')), eq(device.userId, c.get('user').id)))
        .returning({ id: device.id })
      if (!deleted.length) throw new AppError('not_found', 404)
      return c.body(null, 204)
    })
    .get('/payments', async (c) => {
      const rows = await db
        .select()
        .from(payment)
        .where(eq(payment.userId, c.get('user').id))
        .orderBy(desc(payment.createdAt))
      return c.json(rows.map(toPayment))
    })
}
```

Replace `server/app.ts`:

```ts
import { Hono } from 'hono'
import type { AppConfig } from '../shared/api.ts'
import { rewriteAuthError } from './auth-errors.ts'
import type { Auth } from './auth.ts'
import type { Config } from './config.ts'
import type { Db } from './db/client.ts'
import { AppError, errorResponse } from './errors.ts'
import { checkOrigin } from './middleware.ts'
import { devMailRoutes } from './routes/dev-mail.ts'
import { meRoutes } from './routes/me.ts'

export interface AppDeps {
  config: Config
  db: Db
  auth: Auth
}

export function createApp({ config, db, auth }: AppDeps) {
  const app = new Hono()

  // Changing requests must come from the site itself.
  app.use('/api/*', checkOrigin(config.appUrl))

  app.get('/api/config', (c) => {
    const body: AppConfig = { googleEnabled: config.google !== null, devMail: config.devMail }
    return c.json(body)
  })

  // Better Auth answers everything under /api/auth; its errors are reduced to { error: { code } }.
  app.on(['GET', 'POST'], '/api/auth/*', async (c) => rewriteAuthError(await auth.handler(c.req.raw)))

  app.route('/api/me', meRoutes({ db, auth }))
  if (config.devMail) app.route('/api/dev/mail', devMailRoutes({ db }))

  app.notFound((c) => errorResponse(c, 'not_found', 404))
  app.onError((err, c) => {
    if (err instanceof AppError) return errorResponse(c, err.code, err.status)
    console.error(err)
    return errorResponse(c, 'server_error', 500)
  })

  return app
}
```

- [ ] **Step 4: Проверить, что тесты проходят**

Run: `npm test -- server`
Expected: PASS.

- [ ] **Step 5: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 6: Commit**

```bash
git add server
git commit -m "Add /api/me: profile, devices, payments, preferences and cancellation" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 8: `/api/checkout`

Сумму считает сервер, карта не сохраняется (только бренд и last4), `4000 0000 0000 0002` даёт `card_declined`, неподтверждённый email — `email_not_verified`. Платёж и подписка пишутся в одной транзакции.

**Files:**
- Create: `server/routes/checkout.ts`, `server/routes/checkout.test.ts`
- Modify: `server/app.ts`

**Interfaces:**
- Consumes: `priceCents`, `planIds`, `billings` (Task 1), `cardBrand`, `isExpiryValid` (`shared/card.ts`), `toSubscription`, `toPayment` (Task 7), `requireUser` (Task 6).
- Produces (HTTP): `POST /api/checkout` `{ plan: 'free' }` или `{ plan: 'standard' | 'premium', billing, card: { number, expiry, cvc, name } }` → `CheckoutResult`. Ошибки: 403 `email_not_verified`, 402 `card_declined`, 400 `validation_failed`. Лишние поля тела (например, `amount`) отбрасываются.
- Produces: `DECLINED_CARD = '4000000000000002'`, `checkoutRoutes({ db, auth })`.

- [ ] **Step 1: Написать падающий тест**

Create `server/routes/checkout.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { CheckoutResult, Me, Payment } from '../../shared/api.ts'
import { createTestApp, json, type TestApp } from '../test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

const card = { number: '4242 4242 4242 4242', expiry: '12/40', cvc: '123', name: 'Test' }

function checkout(cookie: string, body: unknown) {
  return t.call('/api/checkout', { method: 'POST', cookie, body })
}

describe('POST /api/checkout', () => {
  it('needs a confirmed email', async () => {
    const cookie = await t.signUp('unverified@example.com')
    const res = await checkout(cookie, { plan: 'standard', billing: 'monthly', card })
    expect(res.status).toBe(403)
    expect(await json(res)).toEqual({ error: { code: 'email_not_verified' } })
  })

  it('charges the server price, whatever the page sends', async () => {
    const cookie = await t.verifiedUser('price@example.com')
    const res = await checkout(cookie, { plan: 'premium', billing: 'yearly', card, amount: 1, price: 0 })
    expect(res.status).toBe(200)
    const result = await json<CheckoutResult>(res)
    expect(result.payment).toMatchObject({ plan: 'premium', billing: 'yearly', amount: 12000, cardBrand: 'Visa', cardLast4: '4242' })
    expect(result.payment?.id).toMatch(/^INV-[0-9A-F]{10}$/)
    expect(result.subscription).toMatchObject({ plan: 'premium', billing: 'yearly', status: 'active' })

    const payments = await json<Payment[]>(await t.call('/api/me/payments', { cookie }))
    expect(payments).toHaveLength(1)
    expect(JSON.stringify(payments)).not.toContain('4242 4242')
  })

  it('declines the test card 4000 0000 0000 0002 and records nothing', async () => {
    const cookie = await t.verifiedUser('declined@example.com')
    const res = await checkout(cookie, {
      plan: 'standard',
      billing: 'monthly',
      card: { ...card, number: '4000 0000 0000 0002' },
    })
    expect(res.status).toBe(402)
    expect(await json(res)).toEqual({ error: { code: 'card_declined' } })
    expect(await json(await t.call('/api/me/payments', { cookie }))).toEqual([])
    expect((await json<Me>(await t.call('/api/me', { cookie }))).subscription).toBeNull()
  })

  it('activates the free plan without a card or a payment', async () => {
    const cookie = await t.verifiedUser('free@example.com')
    const result = await json<CheckoutResult>(await checkout(cookie, { plan: 'free' }))
    expect(result).toMatchObject({ payment: null, subscription: { plan: 'free', billing: null, renewsAt: null } })
  })

  it('rejects bad cards and unknown plans with validation_failed', async () => {
    const cookie = await t.verifiedUser('invalid@example.com')
    for (const body of [
      { plan: 'standard', billing: 'monthly', card: { ...card, number: '4242' } },
      { plan: 'standard', billing: 'monthly', card: { ...card, expiry: '01/20' } },
      { plan: 'standard', billing: 'monthly', card: { ...card, cvc: '1' } },
      { plan: 'standard', billing: 'weekly', card },
      { plan: 'platinum', billing: 'monthly', card },
      { plan: 'standard', billing: 'monthly' },
    ]) {
      const res = await checkout(cookie, body)
      expect(res.status).toBe(400)
      expect(await json(res)).toEqual({ error: { code: 'validation_failed' } })
    }
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test -- server/routes/checkout.test.ts`
Expected: FAIL — `/api/checkout` отвечает 404.

- [ ] **Step 3: Реализовать**

Create `server/routes/checkout.ts`:

```ts
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
```

Replace `server/app.ts` (итоговая версия):

```ts
import { Hono } from 'hono'
import type { AppConfig } from '../shared/api.ts'
import { rewriteAuthError } from './auth-errors.ts'
import type { Auth } from './auth.ts'
import type { Config } from './config.ts'
import type { Db } from './db/client.ts'
import { AppError, errorResponse } from './errors.ts'
import { checkOrigin } from './middleware.ts'
import { checkoutRoutes } from './routes/checkout.ts'
import { devMailRoutes } from './routes/dev-mail.ts'
import { meRoutes } from './routes/me.ts'

export interface AppDeps {
  config: Config
  db: Db
  auth: Auth
}

export function createApp({ config, db, auth }: AppDeps) {
  const app = new Hono()

  // Changing requests must come from the site itself.
  app.use('/api/*', checkOrigin(config.appUrl))

  app.get('/api/config', (c) => {
    const body: AppConfig = { googleEnabled: config.google !== null, devMail: config.devMail }
    return c.json(body)
  })

  // Better Auth answers everything under /api/auth; its errors are reduced to { error: { code } }.
  app.on(['GET', 'POST'], '/api/auth/*', async (c) => rewriteAuthError(await auth.handler(c.req.raw)))

  app.route('/api/me', meRoutes({ db, auth }))
  app.route('/api/checkout', checkoutRoutes({ db, auth }))
  if (config.devMail) app.route('/api/dev/mail', devMailRoutes({ db }))

  app.notFound((c) => errorResponse(c, 'not_found', 404))
  app.onError((err, c) => {
    if (err instanceof AppError) return errorResponse(c, err.code, err.status)
    console.error(err)
    return errorResponse(c, 'server_error', 500)
  })

  return app
}
```

- [ ] **Step 4: Проверить, что тест проходит**

Run: `npm test -- server`
Expected: PASS.

- [ ] **Step 5: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 6: Commit**

```bash
git add server
git commit -m "Add /api/checkout with server-side pricing and a test decline card" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 9: Клиент API на сайте

`apiFetch` (JSON, `credentials: 'include'`, разбор `{ error: { code } }` в `ApiError`, `network` при обрыве), хуки данных без сторонних библиотек, общий вид загрузки и ошибки, тексты ошибок EN/RU. Страницы пока не меняются.

**Files:**
- Create: `src/api/client.ts`, `src/api/client.test.ts`, `src/api/errorMessage.ts`, `src/api/useApi.ts`, `src/api/ApiState.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/ru.ts`

**Interfaces:**
- Consumes: `isErrorCode`, `ErrorCode`, `Me`, `Device`, `Payment`, `AppConfig` (Task 1); `useAuth().user` (сейчас старый провайдер, после Task 11 новый — оба отдают `user | null`).
- Produces: `type ClientErrorCode = ErrorCode | 'network'`; `class ApiError { code: ClientErrorCode; status: number }`; `toApiError(error: unknown): ApiError`; `errorFromBody(status, body): ApiError`; `apiFetch<T>(path, { method?, body? }?): Promise<T>` (204 → `undefined`).
- Produces: `errorMessage(t: Dictionary, error: unknown): string`.
- Produces: `useApi<T>(path: string | null) → { data?: T; error?: ApiError; loading: boolean; reload(): void; setData(data: T): void }`; `useMe()`, `useDevices()`, `usePayments()` (не грузят, пока нет пользователя); `useConfig()`.
- Produces: `<ApiState error? onRetry? />`: без ошибки — «Загрузка…», `unauthorized` — переход на `/login?next=…`, иначе текст ошибки и кнопка «Повторить».
- Produces (словарь): `t.common.loading`, `t.common.retry`, `t.errors: Record<ErrorCode | 'network', string>`.

- [ ] **Step 1: Написать падающий тест**

Create `src/api/client.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch, errorFromBody } from './client'

function mockFetch(impl: () => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('sends JSON with the session cookie and returns the parsed body', async () => {
    const fetch = mockFetch(async () => Response.json({ ok: true }))
    expect(await apiFetch('/api/me', { method: 'PATCH', body: { name: 'A' } })).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledWith('/api/me', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"A"}',
    })
  })

  it('returns undefined for 204', async () => {
    mockFetch(async () => new Response(null, { status: 204 }))
    expect(await apiFetch('/api/me/devices/x', { method: 'DELETE' })).toBeUndefined()
  })

  it('turns { error: { code } } into an ApiError with that code and status', async () => {
    mockFetch(async () => Response.json({ error: { code: 'device_limit' } }, { status: 409 }))
    await expect(apiFetch('/api/me/devices', { method: 'POST', body: {} })).rejects.toMatchObject({
      code: 'device_limit',
      status: 409,
    })
  })

  it('an unknown code or a non-JSON body is server_error', async () => {
    mockFetch(async () => Response.json({ error: { code: 'teapot' } }, { status: 418 }))
    await expect(apiFetch('/api/x')).rejects.toMatchObject({ code: 'server_error', status: 418 })
    mockFetch(async () => new Response('<html>Bad gateway</html>', { status: 502 }))
    await expect(apiFetch('/api/x')).rejects.toMatchObject({ code: 'server_error', status: 502 })
  })

  it('a failed connection is network', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    const error = await apiFetch('/api/me').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'network', status: 0 })
  })
})

it('errorFromBody tolerates any shape', () => {
  expect(errorFromBody(401, { error: { code: 'unauthorized' } }).code).toBe('unauthorized')
  expect(errorFromBody(500, null).code).toBe('server_error')
  expect(errorFromBody(400, 'text').code).toBe('server_error')
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test -- src/api/client.test.ts`
Expected: FAIL — нет модуля `./client`.

- [ ] **Step 3: Реализовать клиент**

Create `src/api/client.ts`:

```ts
import { isErrorCode, type ErrorCode } from '../../shared/api'

export type ClientErrorCode = ErrorCode | 'network'

// Every failed API call ends up as an ApiError with one of the spec's codes,
// or 'network' when the server could not be reached at all.
export class ApiError extends Error {
  readonly code: ClientErrorCode
  readonly status: number

  constructor(code: ClientErrorCode, status: number) {
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('server_error', 0)
}

// Reads { error: { code } } from a failed response body; anything else is server_error.
export function errorFromBody(status: number, body: unknown): ApiError {
  const code = (body as { error?: { code?: unknown } } | null)?.error?.code
  return new ApiError(isErrorCode(code) ? code : 'server_error', status)
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

export async function apiFetch<T>(path: string, { method = 'GET', body }: ApiOptions = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('network', 0)
  }
  if (res.status === 204) return undefined as T
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // An empty or non-JSON body: the status decides below.
  }
  if (!res.ok) throw errorFromBody(res.status, data)
  return data as T
}
```

Create `src/api/errorMessage.ts`:

```ts
import type { Dictionary } from '../i18n/en'
import { toApiError } from './client'

// The text for any caught error, in the page language.
export function errorMessage(t: Dictionary, error: unknown) {
  return t.errors[toApiError(error).code] ?? t.errors.server_error
}
```

Create `src/api/useApi.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import type { AppConfig, Device, Me, Payment } from '../../shared/api'
import { useAuth } from '../auth/useAuth'
import { apiFetch, toApiError, type ApiError } from './client'

interface State<T> {
  path: string | null
  data?: T
  error?: ApiError
}

// Loads one GET endpoint. `path: null` means "not now" (e.g. signed out).
// Data from a previous path is never shown for a new one.
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ path: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!path) return
    let alive = true
    apiFetch<T>(path).then(
      (data) => {
        if (alive) setState({ path, data })
      },
      (error: unknown) => {
        if (alive) setState({ path, error: toApiError(error) })
      },
    )
    return () => {
      alive = false
    }
  }, [path, version])

  const current: State<T> = state.path === path ? state : { path }
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  // Replaces the loaded data after a successful change, without a refetch.
  const setData = useCallback((data: T) => setState({ path, data }), [path])

  return {
    data: current.data,
    error: current.error,
    loading: path !== null && current.data === undefined && current.error === undefined,
    reload,
    setData,
  }
}

export function useMe() {
  const { user } = useAuth()
  return useApi<Me>(user ? '/api/me' : null)
}

export function useDevices() {
  const { user } = useAuth()
  return useApi<Device[]>(user ? '/api/me/devices' : null)
}

export function usePayments() {
  const { user } = useAuth()
  return useApi<Payment[]>(user ? '/api/me/payments' : null)
}

export function useConfig() {
  return useApi<AppConfig>('/api/config')
}
```

Create `src/api/ApiState.tsx`:

```tsx
import { useLocation } from 'react-router'
import { LocalNavigate } from '../i18n/LocalLink'
import { useT } from '../i18n/useT'
import type { ApiError } from './client'
import { errorMessage } from './errorMessage'

// What a page shows instead of its data: a loading line, a sign-in redirect
// on 401, or the error with a Retry button.
export function ApiState({ error, onRetry }: { error?: ApiError; onRetry?: () => void }) {
  const t = useT()
  const location = useLocation()

  if (!error) {
    return (
      <p className="form-note" role="status">
        {t.common.loading}
      </p>
    )
  }
  if (error.code === 'unauthorized') {
    const next = location.pathname + location.search
    return <LocalNavigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return (
    <div className="notice" role="alert">
      <p>{errorMessage(t, error)}</p>
      {onRetry && (
        <button type="button" className="btn btn-outline" onClick={onRetry}>
          {t.common.retry}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Тексты ошибок**

В `src/i18n/en.ts`:

Найти:

```ts
    pricePerMonth: (price: string) => `${price} / month`,
  },
```

Заменить на:

```ts
    pricePerMonth: (price: string) => `${price} / month`,
    loading: 'Loading…',
    retry: 'Try Again',
  },
  // One message per API error code (shared/api.ts) plus 'network'.
  errors: {
    invalid_credentials: 'Wrong email or password.',
    email_not_verified: 'Confirm your email first: open the link we sent you.',
    account_banned: 'This account is blocked. If you think this is a mistake, contact support.',
    token_expired: 'This link has expired. Please request a new one.',
    token_invalid: 'This link is invalid or has already been used.',
    weak_password: 'Use at least 8 characters for the password.',
    email_taken: 'An account with this email already exists.',
    device_limit: 'Your plan has no free device slots left.',
    card_declined: 'The card was declined. Try another card.',
    validation_failed: 'Some fields are filled in incorrectly. Check the form and try again.',
    rate_limited: 'Too many attempts. Wait a minute and try again.',
    unauthorized: 'Your session has ended. Please sign in again.',
    forbidden: "You don't have access to this.",
    not_found: 'Nothing was found.',
    server_error: 'Something went wrong on our side. Please try again.',
    network: "Can't reach the server. Check your internet connection.",
  } satisfies Record<ErrorCode | 'network', string>,
```

В `src/i18n/en.ts`:

Найти:

```ts
import type { PlanId } from '../data/plans'
```

Заменить на:

```ts
import type { ErrorCode } from '../../shared/api'
import type { PlanId } from '../data/plans'
```

В `src/i18n/ru.ts`:

Найти:

```ts
    pricePerMonth: (price: string) => `${price} / мес`,
  },
```

Заменить на:

```ts
    pricePerMonth: (price: string) => `${price} / мес`,
    loading: 'Загрузка…',
    retry: 'Повторить',
  },
  errors: {
    invalid_credentials: 'Неверный email или пароль.',
    email_not_verified: 'Сначала подтвердите email: откройте ссылку из нашего письма.',
    account_banned: 'Этот аккаунт заблокирован. Если вы считаете, что это ошибка, напишите в поддержку.',
    token_expired: 'Срок действия ссылки истёк. Запросите новую.',
    token_invalid: 'Ссылка недействительна или уже использована.',
    weak_password: 'Пароль должен содержать не менее 8 символов.',
    email_taken: 'Аккаунт с таким email уже существует.',
    device_limit: 'На вашем тарифе не осталось свободных мест для устройств.',
    card_declined: 'Карта отклонена. Попробуйте другую карту.',
    validation_failed: 'Некоторые поля заполнены неверно. Проверьте форму и попробуйте ещё раз.',
    rate_limited: 'Слишком много попыток. Подождите минуту и попробуйте снова.',
    unauthorized: 'Сеанс завершён. Войдите снова.',
    forbidden: 'У вас нет доступа к этому действию.',
    not_found: 'Ничего не найдено.',
    server_error: 'Что-то пошло не так на нашей стороне. Попробуйте ещё раз.',
    network: 'Не удаётся связаться с сервером. Проверьте подключение к интернету.',
  },
```

- [ ] **Step 5: Проверить, что тест проходит**

Run: `npm test -- src/api/client.test.ts`
Expected: PASS.

- [ ] **Step 6: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 7: Commit**

```bash
git add src/api src/i18n/en.ts src/i18n/ru.ts
git commit -m "Add the site API client, data hooks and error messages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 10: Кабинет, оформление заказа и серверы через API

Обзор, Устройства, Оплата, переключатели в Настройках, Checkout и Servers берут данные из API и меняют их через API. Вход пока старый (Task 11), поэтому в браузере кабинет оживёт после Task 11: сейчас без серверной сессии страницы покажут переход на вход. Проверка этой задачи — типы, тесты и сборка.

**Files:**
- Create: `src/api/checkout.ts`, `src/api/checkout.test.ts`, `src/pages/dashboard/settings/PreferencesCard.tsx`
- Modify (целиком): `src/auth/account.ts`, `src/pages/Checkout.tsx`, `src/pages/dashboard/Overview.tsx`, `src/pages/dashboard/Devices.tsx`, `src/pages/dashboard/Billing.tsx`, `src/pages/dashboard/Settings.tsx`
- Modify: `src/pages/Servers.tsx`, `src/i18n/en.ts`, `src/i18n/ru.ts`

**Interfaces:**
- Consumes: `apiFetch`, `errorMessage`, `useMe`, `useDevices`, `usePayments`, `ApiState` (Task 9); `deviceLimit`, `YEARLY_MONTHS` (Task 1); HTTP из Tasks 7–8.
- Produces: `interface CardInput { name; number; expiry; cvc }`; `checkoutBody(plan: PlanId, billing: Billing, card: CardInput)` → `{ plan }` для free, иначе `{ plan, billing, card }` (никогда цену).
- Produces: `<PreferencesCard />` (сам грузит `useMe`, переключает оптимистично и откатывает при ошибке).
- `src/auth/account.ts` теперь содержит только `formatDate(value: string | Date, locale)`; `getPreferences`, `getDevices`, `newId`, `renewalDate`, `defaultPreferences` удалены.
- Словарь: `t.billing.cancelConfirm(planName, date)`, `t.billing.cancelled(planName, date)`, новые `t.billing.endsOnBefore`, `t.billing.cardNote`; удалены `t.billing.expires`, `saveCard`, `cancel`, `updateCard`, `addCard`, `cardUpdated`, `t.devices.signedInNow`.

- [ ] **Step 1: Написать падающий тест**

Create `src/api/checkout.test.ts`:

```ts
import { expect, it } from 'vitest'
import { checkoutBody } from './checkout'

const card = { name: 'Ann', number: '4242 4242 4242 4242', expiry: '12/40', cvc: '123' }

it('sends no card for the free plan', () => {
  expect(checkoutBody('free', 'yearly', card)).toEqual({ plan: 'free' })
})

it('sends plan, billing and card, and never a price', () => {
  const body = checkoutBody('premium', 'yearly', card)
  expect(body).toEqual({ plan: 'premium', billing: 'yearly', card })
  expect(Object.keys(body)).not.toContain('amount')
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test -- src/api/checkout.test.ts`
Expected: FAIL — нет модуля `./checkout`.

- [ ] **Step 3: Тело заказа и даты**

Create `src/api/checkout.ts`:

```ts
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
```

Replace `src/auth/account.ts`:

```ts
import { formatDate as formatLocalDate } from '../i18n/format'
import type { Locale } from '../i18n/locales'

// Dates from the API are ISO timestamps; account pages show them short.
export function formatDate(value: string | Date, locale: Locale) {
  return formatLocalDate(typeof value === 'string' ? value : value.toISOString(), locale, 'short')
}
```

- [ ] **Step 4: Checkout**

Replace `src/pages/Checkout.tsx`. Изменения: тариф и период берутся из `me.subscription`; оплата — `POST /api/checkout`; ошибка сервера показывается через `errorMessage`; клиентская проверка формы осталась, но решает сервер.

```tsx
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import type { CheckoutResult } from '../../shared/api'
import { formatCardNumber, formatExpiry, isExpiryValid } from '../../shared/card'
import { YEARLY_MONTHS } from '../../shared/plans'
import { checkoutBody } from '../api/checkout'
import { apiFetch } from '../api/client'
import { errorMessage } from '../api/errorMessage'
import { useMe } from '../api/useApi'
import { useAuth } from '../auth/useAuth'
import { message, useT, type Message } from '../i18n/useT'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { formatPrice } from '../i18n/format'
import { getPlan, plans, type Billing, type PlanId } from '../data/plans'

export function Checkout() {
  const { user } = useAuth()
  const { data: me } = useMe()
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.checkout.metaTitle)
  const navigate = useLocalNavigate()
  const [params, setParams] = useSearchParams()
  const current = me?.subscription ?? null
  const plan = getPlan(params.get('plan')) ?? getPlan(current?.plan) ?? plans[1]
  const [chosenBilling, setBilling] = useState<Billing | null>(null)
  const billing = chosenBilling ?? current?.billing ?? 'monthly'
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' })
  const [error, setError] = useState<Message>(null)
  const [processing, setProcessing] = useState(false)

  const isFree = plan.price === 0
  // What the page shows; the server computes the real charge on its own.
  const total = billing === 'yearly' ? plan.price * YEARLY_MONTHS : plan.price
  // Switching the billing period of the current plan is a valid order.
  const isCurrent =
    current?.status === 'active' && current.plan === plan.id && (isFree || (current.billing ?? 'monthly') === billing)

  function selectPlan(id: PlanId) {
    setParams({ plan: id }, { replace: true })
    setError(null)
  }

  function handleCard(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const formatted =
      name === 'number'
        ? formatCardNumber(value)
        : name === 'expiry'
          ? formatExpiry(value)
          : name === 'cvc'
            ? value.replace(/\D/g, '').slice(0, 4)
            : value
    setCard((prev) => ({ ...prev, [name]: formatted }))
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // Quick checks for a friendlier form; the server validates again and decides.
    if (!isFree) {
      if (card.number.replace(/\s/g, '').length !== 16) return setError(message((t) => t.checkout.errors.cardNumber))
      if (!isExpiryValid(card.expiry)) return setError(message((t) => t.checkout.errors.expiry))
      if (card.cvc.length < 3) return setError(message((t) => t.checkout.errors.cvc))
    }
    setProcessing(true)
    try {
      await apiFetch<CheckoutResult>('/api/checkout', {
        method: 'POST',
        body: checkoutBody(plan.id, billing, card),
      })
      navigate('/dashboard?welcome=1', { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setProcessing(false)
    }
  }

  return (
    <section className="checkout container">
      <h1 className="section-title">{t.checkout.title}</h1>
      <p className="checkout-subtitle">
        {t.checkout.signedInBefore}
        <b>{user?.email}</b>
        {t.checkout.signedInAfter}
      </p>

      <form className="checkout-grid" onSubmit={handleSubmit}>
        <div className="checkout-main">
          <fieldset className="checkout-step">
            <legend>{t.checkout.stepPlan}</legend>
            <div className="plan-options">
              {plans.map((p) => (
                <label key={p.id} className={`plan-option${p.id === plan.id ? ' is-active' : ''}`}>
                  <input
                    type="radio"
                    name="plan"
                    value={p.id}
                    checked={p.id === plan.id}
                    onChange={() => selectPlan(p.id)}
                  />
                  <img src={p.image} alt="" width={56} height={64} />
                  <span className="plan-option-name">{t.plans[p.id].name}</span>
                  <span className="plan-option-price">
                    {p.price === 0 ? t.pricing.free : `${formatPrice(p.price, locale)} ${t.pricing.perMonth}`}
                  </span>
                  {current?.plan === p.id && <span className="badge">{t.checkout.current}</span>}
                </label>
              ))}
            </div>
          </fieldset>

          {!isFree && (
            <fieldset className="checkout-step">
              <legend>{t.checkout.stepBilling}</legend>
              <div className="segmented">
                {(['monthly', 'yearly'] as const).map((b) => (
                  <label key={b} className={billing === b ? 'is-active' : ''}>
                    <input
                      type="radio"
                      name="billing"
                      value={b}
                      checked={billing === b}
                      onChange={() => setBilling(b)}
                    />
                    {b === 'monthly' ? t.checkout.monthly : t.checkout.yearly}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {!isFree && (
            <fieldset className="checkout-step">
              <legend>{t.checkout.stepPayment}</legend>
              <p className="demo-note">
                {t.checkout.demoNote}
              </p>
              <div className="form">
                <label className="field">
                  <span>{t.checkout.nameOnCard}</span>
                  <input name="name" required autoComplete="cc-name" value={card.name} onChange={handleCard} />
                </label>
                <label className="field">
                  <span>{t.checkout.cardNumber}</span>
                  <input
                    name="number"
                    required
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="4242 4242 4242 4242"
                    value={card.number}
                    onChange={handleCard}
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>{t.checkout.expiry}</span>
                    <input
                      name="expiry"
                      required
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder={t.checkout.expiryPlaceholder}
                      value={card.expiry}
                      onChange={handleCard}
                    />
                  </label>
                  <label className="field">
                    <span>{t.checkout.cvc}</span>
                    <input
                      name="cvc"
                      required
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      value={card.cvc}
                      onChange={handleCard}
                    />
                  </label>
                </div>
              </div>
            </fieldset>
          )}
        </div>

        <aside className="summary">
          <h2 className="summary-title">{t.checkout.summary}</h2>
          <div className="summary-plan">
            <img src={plan.image} alt="" width={72} height={82} />
            <div>
              <p className="summary-plan-name">{t.plans[plan.id].name}</p>
              <p>{isFree ? t.checkout.freeForever : billing === 'monthly' ? t.checkout.billedMonthly : t.checkout.billedYearly}</p>
            </div>
          </div>
          <ul className="plan-perks summary-perks">
            {t.plans[plan.id].perks.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
          {billing === 'yearly' && !isFree && (
            <p className="summary-line">
              <span>{t.checkout.discount}</span>
              <span className="summary-discount">−{formatPrice(plan.price * 2, locale)}</span>
            </p>
          )}
          <p className="summary-line summary-total">
            <span>{t.checkout.totalToday}</span>
            <span>{formatPrice(total, locale)}</span>
          </p>
          {error && <p className="form-error">{error(t)}</p>}
          <button type="submit" className="btn btn-primary form-submit" disabled={processing || isCurrent}>
            {processing
              ? t.checkout.processing
              : isCurrent
                ? t.checkout.currentPlan
                : isFree
                  ? t.checkout.activateFree
                  : t.checkout.pay(formatPrice(total, locale))}
          </button>
        </aside>
      </form>
    </section>
  )
}
```

- [ ] **Step 5: Обзор, Устройства, Оплата**

Replace `src/pages/dashboard/Overview.tsx`. Изменения: `useMe` + `useDevices` вместо `useAuth().user`; «Продление» — `subscription.renewsAt` активной подписки, иначе «С нами с» по `me.user.createdAt`; бейдж «Это устройство» у устройств убран.

```tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { LocalLink } from '../../i18n/LocalLink'
import { ApiState } from '../../api/ApiState'
import { useDevices, useMe } from '../../api/useApi'
import { formatDate } from '../../auth/account'
import { getPlatform } from '../../data/platforms'
import { formatMonthYear, formatPrice } from '../../i18n/format'
import { useLocale } from '../../i18n/useLocale'
import { usePageMeta } from '../../i18n/usePageMeta'
import { useT } from '../../i18n/useT'
import { getPlan } from '../../data/plans'
import { placeName, servers } from '../../data/servers'

// Links in the same order as t.overview.quickLinks.
const quickLinkTargets = ['/download', '/tutorials', '/faq', '/help#contact']

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000)
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function fakeIp(serverId: string) {
  let hash = 0
  for (const ch of serverId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return `185.${(hash >> 16) & 255}.${(hash >> 8) & 255}.${hash & 255}`
}

export function Overview() {
  const me = useMe()
  const devicesState = useDevices()
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.overview.metaTitle)
  const [params, setParams] = useSearchParams()
  const subscription = me.data?.subscription ?? null
  const plan = getPlan(subscription?.plan)
  const [serverId, setServerId] = useState(
    () => servers.find((s) => s.id === params.get('server'))?.id ?? servers[0].id,
  )
  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const limit = plan?.devices ?? 1
  const [before, between, after] = t.overview.devicesInUse(limit)

  const server = servers.find((s) => s.id === serverId) ?? servers[0]
  const locked = server.premium && plan?.id !== 'premium'
  const welcome = params.get('welcome') === '1'

  useEffect(() => {
    if (connectedAt === null) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [connectedAt])

  if (!me.data || !devicesState.data) {
    return (
      <ApiState
        error={me.error ?? devicesState.error}
        onRetry={() => {
          me.reload()
          devicesState.reload()
        }}
      />
    )
  }

  const devices = devicesState.data
  // A cancelled plan does not renew; it just runs out.
  const renewsAt = subscription?.status === 'active' ? subscription.renewsAt : null

  function toggleConnection() {
    if (connectedAt !== null) {
      setConnectedAt(null)
      return
    }
    const start = Date.now()
    setNow(start)
    setConnectedAt(start)
  }

  function changeServer(id: string) {
    setServerId(id)
    setConnectedAt(null)
  }

  return (
    <>
      {welcome && plan && (
        <div className="toast" role="status">
          <span>
            {t.overview.welcomeBefore}
            <b>{t.plans[plan.id].name}</b>
            {t.overview.welcomeAfter}
          </span>
          <button type="button" aria-label={t.common.dismiss} onClick={() => setParams({}, { replace: true })}>
            ×
          </button>
        </div>
      )}

      {!plan && (
        <div className="notice">
          <p>{t.overview.noPlan}</p>
          <LocalLink to="/checkout" className="btn btn-primary">
            {t.common.choosePlan}
          </LocalLink>
        </div>
      )}

      <div className="dashboard-grid">
        <div className={`card connect${connectedAt !== null ? ' is-on' : ''}`}>
          <h2 className="card-title">{t.overview.connection}</h2>
          <button
            type="button"
            className="connect-button"
            disabled={!plan || locked}
            onClick={toggleConnection}
            aria-pressed={connectedAt !== null}
          >
            <span className="connect-power" aria-hidden="true">
              ⏻
            </span>
            {connectedAt !== null ? t.overview.disconnect : t.overview.connect}
          </button>
          <p className="connect-status">
            {connectedAt !== null ? (
              <>
                {t.overview.protected} · {formatDuration(now - connectedAt)}
                <br />
                {t.overview.yourIp} <b>{fakeIp(server.id)}</b>
              </>
            ) : (
              t.overview.notProtected
            )}
          </p>

          <label className="field">
            <span>{t.overview.serverLocation}</span>
            <select value={serverId} onChange={(e) => changeServer(e.target.value)}>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.flag} {placeName(s.city, locale)}, {placeName(s.country, locale)} — {s.ping} {t.overview.ms}
                  {s.premium ? ` · ${t.overview.premium}` : ''}
                </option>
              ))}
            </select>
          </label>
          {locked && (
            <p className="form-note">
              {t.overview.lockedBefore}
              <LocalLink to="/checkout?plan=premium">{t.common.upgrade}</LocalLink>
            </p>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">{t.overview.yourPlan}</h2>
          {plan ? (
            <>
              <div className="summary-plan">
                <img src={plan.image} alt="" width={72} height={82} />
                <div>
                  <p className="summary-plan-name">{t.plans[plan.id].name}</p>
                  <p>{plan.price === 0
                      ? t.checkout.freeForever
                      : t.common.pricePerMonth(formatPrice(plan.price, locale))}</p>
                </div>
              </div>
              <ul className="stat-list">
                <li>
                  <span>{t.overview.locations}</span>
                  <b>{plan.id === 'premium' ? servers.length : servers.filter((s) => !s.premium).length}</b>
                </li>
                <li>
                  <span>{renewsAt ? t.overview.renewsOn : t.overview.memberSince}</span>
                  <b>{renewsAt ? formatDate(renewsAt, locale) : formatMonthYear(me.data.user.createdAt, locale)}</b>
                </li>
              </ul>
              <LocalLink to="/dashboard/billing" className="btn btn-outline">
                {t.overview.manageBilling}
              </LocalLink>
            </>
          ) : (
            <p>{t.overview.noActivePlan}</p>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">{t.dashboard.tabs.devices}</h2>
          <p>
            {before}
            <b>{devices.length}</b>
            {between}
            <b>{limit}</b>
            {after}
          </p>
          <ul className="stat-list">
            {devices.slice(0, 3).map((device) => (
              <li key={device.id}>
                <span>
                  {getPlatform(device.platform, locale)?.icon} {device.name}
                </span>
              </li>
            ))}
          </ul>
          <LocalLink to="/dashboard/devices" className="btn btn-outline">
            {t.overview.manageDevices}
          </LocalLink>
        </div>
      </div>

      <h2 className="dashboard-subtitle">{t.overview.getMost}</h2>
      <ul className="quick-links">
        {t.overview.quickLinks.map((link, i) => (
          <li key={quickLinkTargets[i]}>
            <LocalLink to={quickLinkTargets[i]} className="card quick-link">
              <span className="card-title">{link.title}</span>
              <span>{link.text}</span>
            </LocalLink>
          </li>
        ))}
      </ul>
    </>
  )
}
```

Replace `src/pages/dashboard/Devices.tsx`. Изменения: список из `useDevices`, лимит `deviceLimit(plan)`, добавление и удаление через API, ошибка (`device_limit` и другие) показывается над списком.

```tsx
import { useState, type FormEvent } from 'react'
import type { Device } from '../../../shared/api'
import { deviceLimit } from '../../../shared/plans'
import { ApiState } from '../../api/ApiState'
import { apiFetch } from '../../api/client'
import { errorMessage } from '../../api/errorMessage'
import { useDevices, useMe } from '../../api/useApi'
import { LocalLink } from '../../i18n/LocalLink'
import { formatDate } from '../../auth/account'
import { getPlatform, getPlatforms } from '../../data/platforms'
import { useLocale } from '../../i18n/useLocale'
import { usePageMeta } from '../../i18n/usePageMeta'
import { message, useT, type Message } from '../../i18n/useT'
import { getPlan } from '../../data/plans'

export function Devices() {
  const me = useMe()
  const devicesState = useDevices()
  const t = useT()
  const locale = useLocale()
  const platforms = getPlatforms(locale)
  usePageMeta(t.devices.metaTitle)
  const [added, setAdded] = useState<Device | null>(null)
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  if (!me.data || !devicesState.data) {
    return (
      <ApiState
        error={me.error ?? devicesState.error}
        onRetry={() => {
          me.reload()
          devicesState.reload()
        }}
      />
    )
  }

  const plan = getPlan(me.data.subscription?.plan)
  const limit = deviceLimit(plan?.id)
  const devices = devicesState.data
  const full = devices.length >= limit
  const over = devices.length > limit

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const platform = String(data.get('platform'))
    const name = String(data.get('name')).trim() || t.devices.defaultName(getPlatform(platform, locale)?.name)
    setBusy(true)
    setError(null)
    try {
      const device = await apiFetch<Device>('/api/me/devices', { method: 'POST', body: { name, platform } })
      devicesState.setData([...devices, device])
      setAdded(device)
      form.reset()
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setError(null)
    try {
      await apiFetch(`/api/me/devices/${encodeURIComponent(id)}`, { method: 'DELETE' })
      devicesState.setData(devices.filter((device) => device.id !== id))
      if (added?.id === id) setAdded(null)
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    }
  }

  return (
    <div className="account-section">
      <div className="account-section-head">
        <div>
          <h2 className="card-title">{t.devices.title}</h2>
          <p>
            {plan
              ? t.devices.usageOnPlan(devices.length, limit, t.plans[plan.id].name)
              : t.devices.usageFree(devices.length, limit)}
          </p>
        </div>
        <div className="usage" role="img" aria-label={t.devices.usageLabel(devices.length, limit)}>
          <span style={{ width: `${Math.min(100, (devices.length / limit) * 100)}%` }} />
        </div>
      </div>

      {over && (
        <div className="notice">
          <p>{t.devices.overLimit(limit, devices.length - limit)}</p>
          <LocalLink to="/checkout?plan=premium" className="btn btn-primary">
            {t.common.upgrade}
          </LocalLink>
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error(t)}
        </p>
      )}

      <ul className="device-list">
        {devices.map((device) => {
          const platform = getPlatform(device.platform, locale)
          return (
            <li key={device.id} className="card device">
              <span className="device-icon" aria-hidden="true">
                {platform?.icon}
              </span>
              <div className="device-info">
                <p className="device-name">{device.name}</p>
                <p className="device-meta">
                  {t.devices.meta(platform?.name ?? '', formatDate(device.createdAt, locale))}
                </p>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => remove(device.id)}>
                {t.devices.remove}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="card account-card">
        <h2 className="card-title">{t.devices.addTitle}</h2>
        {full ? (
          <p>
            {t.devices.fullBefore}
            {plan?.id !== 'premium' && (
              <>
                {t.devices.fullOr}
                <LocalLink to={`/checkout?plan=${plan ? 'premium' : 'standard'}`} className="text-link">
                  {t.devices.fullUpgrade}
                </LocalLink>
              </>
            )}
            {t.devices.fullAfter}
          </p>
        ) : (
          <form className="form device-form" onSubmit={handleAdd}>
            <label className="field">
              <span>{t.devices.deviceName}</span>
              <input name="name" placeholder={t.devices.namePlaceholder} maxLength={40} />
            </label>
            <label className="field">
              <span>{t.devices.platform}</span>
              <select name="platform" defaultValue={platforms[0].id}>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t.devices.addDevice}
            </button>
          </form>
        )}
        {added && (
          <p className="form-note" role="status">
            <b>{added.name}</b>
            {t.devices.addedAfter}
            <LocalLink to={`/tutorials/${added.platform}`}>{t.devices.setupGuide(getPlatform(added.platform, locale)?.name ?? '')}</LocalLink>
          </p>
        )}
      </div>
    </div>
  )
}
```

Replace `src/pages/dashboard/Billing.tsx`. Изменения: подписка из `useMe`, платежи из `usePayments` (суммы в центах), отмена через `POST /api/me/subscription/cancel` и действует до конца периода, «Способ оплаты» показывает карту последнего платежа, редактирования карты больше нет (см. «Отклонения», п. 3).

```tsx
import { useState } from 'react'
import type { Payment, Profile, Subscription } from '../../../shared/api'
import { ApiState } from '../../api/ApiState'
import { apiFetch } from '../../api/client'
import { errorMessage } from '../../api/errorMessage'
import { useMe, usePayments } from '../../api/useApi'
import { LocalLink } from '../../i18n/LocalLink'
import { formatDate } from '../../auth/account'
import { formatAmount, formatPrice } from '../../i18n/format'
import { useLocale } from '../../i18n/useLocale'
import { usePageMeta } from '../../i18n/usePageMeta'
import { message, useT, type Message } from '../../i18n/useT'
import { getPlan } from '../../data/plans'
import type { Dictionary } from '../../i18n/en'
import type { Locale } from '../../i18n/locales'

// cardBrand() stores 'Card' for unknown brands; show it in the page language.
function brandLabel(brand: string, t: Dictionary) {
  return brand === 'Card' ? t.billing.genericCard : brand
}

// Stored data may be older or odd: fall back to the raw plan id, and to monthly.
function planName(id: string, t: Dictionary) {
  return (t.plans as Record<string, { name: string } | undefined>)[id]?.name ?? id
}

function billingName(billing: string | null | undefined, t: Dictionary) {
  return billing === 'yearly' ? t.billing.yearly : t.billing.monthly
}

function downloadInvoice(payment: Payment, user: Profile, t: Dictionary, locale: Locale) {
  const text = t.billing.invoiceText({
    id: payment.id,
    date: formatDate(payment.createdAt, locale),
    billedTo: `${user.name} <${user.email}>`,
    plan: planName(payment.plan, t),
    period: billingName(payment.billing, t),
    amount: formatAmount(payment.amount / 100, locale),
    card: `${brandLabel(payment.cardBrand, t)} •••• ${payment.cardLast4}`,
  })
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${payment.id}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

export function Billing() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.billing.metaTitle)
  const me = useMe()
  const paymentsState = usePayments()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [notice, setNotice] = useState<Message>(null)
  const [error, setError] = useState<Message>(null)

  if (!me.data || !paymentsState.data) {
    return (
      <ApiState
        error={me.error ?? paymentsState.error}
        onRetry={() => {
          me.reload()
          paymentsState.reload()
        }}
      />
    )
  }

  const meData = me.data
  const subscription = meData.subscription
  const plan = getPlan(subscription?.plan)
  const payments = paymentsState.data
  const lastPayment = payments[0]
  const paid = plan !== undefined && plan.price > 0
  const endsAt = subscription?.renewsAt ? formatDate(subscription.renewsAt, locale) : ''

  async function cancelPlan() {
    if (!plan) return
    const planId = plan.id
    setError(null)
    try {
      const next = await apiFetch<Subscription>('/api/me/subscription/cancel', { method: 'POST' })
      me.setData({ ...meData, subscription: next })
      setConfirmCancel(false)
      const date = next.renewsAt ? formatDate(next.renewsAt, locale) : ''
      setNotice(message((t) => t.billing.cancelled(t.plans[planId].name, date)))
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    }
  }

  return (
    <div className="account-section">
      {notice && (
        <div className="toast" role="status">
          <span>{notice(t)}</span>
          <button type="button" aria-label={t.common.dismiss} onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      <div className="account-grid">
        <div className="card account-card">
          <h2 className="card-title">{t.billing.subscription}</h2>
          {plan ? (
            <>
              <div className="summary-plan">
                <img src={plan.image} alt="" width={56} height={64} />
                <div>
                  <p className="summary-plan-name">{t.plans[plan.id].name}</p>
                  <p>
                    {paid
                      ? t.billing[subscription?.billing === 'yearly' ? 'billedYearlyLine' : 'billedMonthlyLine'](
                          formatPrice(plan.price, locale),
                        )
                      : t.checkout.freeForever}
                  </p>
                </div>
              </div>
              {paid && endsAt && (
                <p>
                  {subscription?.status === 'canceled' ? t.billing.endsOnBefore : t.billing.renewsOnBefore}
                  <b>{endsAt}</b>
                </p>
              )}
              <div className="button-row">
                {plan.id !== 'premium' && (
                  <LocalLink to="/checkout?plan=premium" className="btn btn-primary">
                    {t.billing.upgradePremium}
                  </LocalLink>
                )}
                <LocalLink to={`/checkout?plan=${plan.id}`} className="btn btn-outline">
                  {t.billing.changePlan}
                </LocalLink>
              </div>
              {error && <p className="form-error">{error(t)}</p>}
              {paid &&
                subscription?.status === 'active' &&
                (confirmCancel ? (
                  <div className="confirm">
                    <p>{t.billing.cancelConfirm(t.plans[plan.id].name, endsAt)}</p>
                    <div className="button-row">
                      <button type="button" className="btn btn-danger btn-sm" onClick={cancelPlan}>
                        {t.billing.yesCancel}
                      </button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmCancel(false)}>
                        {t.billing.keepPlan}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="link-button" onClick={() => setConfirmCancel(true)}>
                    {t.billing.cancelSubscription}
                  </button>
                ))}
            </>
          ) : (
            <>
              <p>{t.billing.noPlanYet}</p>
              <LocalLink to="/checkout" className="btn btn-primary">
                {t.common.choosePlan}
              </LocalLink>
            </>
          )}
        </div>

        <div className="card account-card">
          <h2 className="card-title">{t.billing.paymentMethod}</h2>
          {lastPayment ? (
            <div className="saved-card">
              <span className="saved-card-brand">{brandLabel(lastPayment.cardBrand, t)}</span>
              <span>•••• {lastPayment.cardLast4}</span>
            </div>
          ) : (
            <p>{t.billing.noCard}</p>
          )}
          <p className="device-meta">{t.billing.cardNote}</p>
        </div>
      </div>

      <div className="card account-card">
        <h2 className="card-title">{t.billing.history}</h2>
        {payments.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.billing.date}</th>
                  <th>{t.billing.invoice}</th>
                  <th>{t.billing.plan}</th>
                  <th>{t.billing.amount}</th>
                  <th>{t.billing.status}</th>
                  <th>
                    <span className="visually-hidden">{t.billing.download}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.createdAt, locale)}</td>
                    <td>{payment.id}</td>
                    <td>
                      {planName(payment.plan, t)} · {billingName(payment.billing, t)}
                    </td>
                    <td>
                      <b>{formatAmount(payment.amount / 100, locale)}</b>
                    </td>
                    <td>
                      <span className="badge badge-green">{t.billing.paid}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => downloadInvoice(payment, meData.user, t, locale)}
                      >
                        {t.billing.download}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{t.billing.noPayments}</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Переключатели настроек**

Create `src/pages/dashboard/settings/PreferencesCard.tsx`:

```tsx
import { useState } from 'react'
import type { Preferences } from '../../../../shared/api'
import { ApiState } from '../../../api/ApiState'
import { apiFetch } from '../../../api/client'
import { errorMessage } from '../../../api/errorMessage'
import { useMe } from '../../../api/useApi'
import { message, useT, type Message } from '../../../i18n/useT'

const toggleKeys: (keyof Preferences)[] = ['autoConnect', 'killSwitch', 'newsletter']

export function PreferencesCard() {
  const t = useT()
  const me = useMe()
  const [error, setError] = useState<Message>(null)
  const preferences = me.data?.preferences

  async function toggle(key: keyof Preferences) {
    if (!me.data) return
    const before = me.data
    // Flip at once; roll back if the server says no.
    me.setData({ ...before, preferences: { ...before.preferences, [key]: !before.preferences[key] } })
    setError(null)
    try {
      const preferences = await apiFetch<Preferences>('/api/me/preferences', {
        method: 'PATCH',
        body: { [key]: !before.preferences[key] },
      })
      me.setData({ ...before, preferences })
    } catch (err) {
      me.setData(before)
      setError(message((t) => errorMessage(t, err)))
    }
  }

  return (
    <div className="card account-card">
      <h2 className="card-title">{t.settings.preferences}</h2>
      <p className="device-meta">{t.settings.synced}</p>
      {preferences ? (
        <ul className="switch-list">
          {toggleKeys.map((key) => (
            <li key={key}>
              <label className="switch">
                <span>
                  <b>{t.settings.toggles[key].title}</b>
                  <span>{t.settings.toggles[key].text}</span>
                </span>
                <input type="checkbox" role="switch" checked={preferences[key]} onChange={() => toggle(key)} />
                <span className="switch-track" aria-hidden="true" />
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <ApiState error={me.error} onRetry={me.reload} />
      )}
      {error && <p className="form-error">{error(t)}</p>}
    </div>
  )
}
```

Replace `src/pages/dashboard/Settings.tsx` (профиль, пароль и удаление пока старые, их заменит Task 11):

```tsx
import { startTransition, useState, type FormEvent } from 'react'
import { useLocalNavigate } from '../../i18n/useLocalNavigate'
import { useAuth } from '../../auth/useAuth'
import { usePageMeta } from '../../i18n/usePageMeta'
import { message, useT, type Message } from '../../i18n/useT'
import { PreferencesCard } from './settings/PreferencesCard'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function Settings() {
  const { user, updateUser, deleteAccount } = useAuth()
  const navigate = useLocalNavigate()
  const t = useT()
  usePageMeta(t.settings.metaTitle)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<Message>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState<Message>(null)
  const [deleteText, setDeleteText] = useState('')

  if (!user) return null

  function handleProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get('name')).trim()
    const email = String(data.get('email')).trim().toLowerCase()
    if (!name) return setProfileError(message((t) => t.settings.enterName))
    if (!EMAIL.test(email)) return setProfileError(message((t) => t.settings.invalidEmail))
    updateUser({ name, email })
    setProfileSaved(true)
  }

  function handlePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const next = String(data.get('next'))
    if (!String(data.get('current'))) return setPasswordError(message((t) => t.settings.enterCurrent))
    if (next.length < 6) return setPasswordError(message((t) => t.settings.newTooShort))
    if (next !== String(data.get('confirm'))) return setPasswordError(message((t) => t.settings.mismatch))
    // Demo: passwords are never stored, so there is nothing to compare or save.
    form.reset()
    setPasswordSaved(true)
  }

  function handleDelete(e: FormEvent) {
    e.preventDefault()
    // Same transition trick as Sign Out, so RequireAuth doesn't send us to /signup.
    startTransition(() => {
      navigate('/')
      deleteAccount()
    })
  }

  return (
    <div className="account-section account-grid">
      <div className="card account-card">
        <h2 className="card-title">{t.settings.profile}</h2>
        <form className="form" noValidate onSubmit={handleProfile} onChange={() => {
          setProfileSaved(false)
          setProfileError(null)
        }}>
          <label className="field">
            <span>{t.signup.fullName}</span>
            <input name="name" defaultValue={user.name} autoComplete="name" required />
          </label>
          <label className="field">
            <span>{t.auth.email}</span>
            <input name="email" type="email" defaultValue={user.email} autoComplete="email" required />
          </label>
          {profileError && <p className="form-error">{profileError(t)}</p>}
          <button type="submit" className="btn btn-outline">
            {profileSaved ? t.settings.saved : t.settings.saveChanges}
          </button>
        </form>
      </div>

      <div className="card account-card">
        <h2 className="card-title">{t.settings.password}</h2>
        <form className="form" onSubmit={handlePassword} onChange={() => {
          setPasswordSaved(false)
          setPasswordError(null)
        }}>
          <label className="field">
            <span>{t.settings.currentPassword}</span>
            <input name="current" type="password" autoComplete="current-password" />
          </label>
          <div className="field-row">
            <label className="field">
              <span>{t.settings.newPassword}</span>
              <input name="next" type="password" autoComplete="new-password" />
            </label>
            <label className="field">
              <span>{t.settings.confirm}</span>
              <input name="confirm" type="password" autoComplete="new-password" />
            </label>
          </div>
          {passwordError && <p className="form-error">{passwordError(t)}</p>}
          {passwordSaved && (
            <p className="form-note" role="status">
              {t.settings.passwordUpdated}
            </p>
          )}
          <button type="submit" className="btn btn-outline">
            {t.settings.updatePassword}
          </button>
        </form>
      </div>

      <PreferencesCard />

      <div className="card account-card danger-zone">
        <h2 className="card-title">{t.settings.deleteTitle}</h2>
        <p>{t.settings.deleteText}</p>
        <form className="form" onSubmit={handleDelete}>
          <label className="field">
            <span>
              {t.settings.typeBefore}
              <b>{t.settings.deleteWord}</b>
              {t.settings.typeAfter}
            </span>
            <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} autoComplete="off" />
          </label>
          <button type="submit" className="btn btn-danger" disabled={deleteText !== t.settings.deleteWord}>
            {t.settings.deleteButton}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Servers**

В `src/pages/Servers.tsx`:

Найти:

```ts
import { useAuth } from '../auth/useAuth'
```

Заменить на:

```ts
import { useMe } from '../api/useApi'
import { useAuth } from '../auth/useAuth'
```

Найти:

```ts
  const { user } = useAuth()
```

Заменить на:

```ts
  const { user } = useAuth()
  const { data: me } = useMe()
```

Найти:

```ts
  const canUse = (premium: boolean) => !premium || user?.plan === 'premium'
```

Заменить на:

```ts
  const canUse = (premium: boolean) => !premium || me?.subscription?.plan === 'premium'
```

- [ ] **Step 8: Тексты**

В `src/i18n/en.ts`:

Найти:

```ts
    demoNote: 'Demo checkout — no payment is processed. Only the card brand and last four digits are kept in this browser.',
```

Заменить на:

```ts
    demoNote:
      'Demo checkout: no money is charged. The test card 4000 0000 0000 0002 is always declined. We keep only the card brand and the last four digits.',
```

В `src/i18n/ru.ts`:

Найти:

```ts
    demoNote:
      'Демо-оформление: платёж не проводится. В этом браузере сохраняются только тип карты и последние четыре цифры.',
```

Заменить на:

```ts
    demoNote:
      'Демо-оформление: деньги не списываются. Тестовая карта 4000 0000 0000 0002 всегда отклоняется. Мы храним только тип карты и последние четыре цифры.',
```

В `src/i18n/en.ts`:

Найти:

```ts
    cancelConfirm: (planName: string) => `Cancel ${planName}? You'll move to the Free Plan right away.`,
```

Заменить на:

```ts
    cancelConfirm: (planName: string, date: string) =>
      `Cancel ${planName}? It stays active until ${date}, then your account moves to the Free Plan.`,
```

В `src/i18n/ru.ts`:

Найти:

```ts
    cancelConfirm: (planName: string) =>
      `Отменить тариф «${planName}»? Вы сразу перейдёте на бесплатный тариф.`,
```

Заменить на:

```ts
    cancelConfirm: (planName: string, date: string) =>
      `Отменить тариф «${planName}»? Он будет действовать до ${date}, затем аккаунт перейдёт на бесплатный тариф.`,
```

В `src/i18n/en.ts`:

Найти:

```ts
    cancelled: (planName: string) => `${planName} cancelled. You're now on the Free Plan.`,
```

Заменить на:

```ts
    cancelled: (planName: string, date: string) => `${planName} cancelled. It stays active until ${date}.`,
    endsOnBefore: 'Cancelled. Active until ',
```

В `src/i18n/ru.ts`:

Найти:

```ts
    cancelled: (planName: string) => `Тариф «${planName}» отменён. Теперь у вас бесплатный тариф.`,
```

Заменить на:

```ts
    cancelled: (planName: string, date: string) => `Тариф «${planName}» отменён. Он действует до ${date}.`,
    endsOnBefore: 'Подписка отменена. Тариф действует до ',
```

В `src/i18n/en.ts`:

Найти:

```ts
    expires: (expiry: string) => `Expires ${expiry}`,
    noCard: 'No card on file.',
    saveCard: 'Save Card',
    cancel: 'Cancel',
    updateCard: 'Update Card',
    addCard: 'Add Card',
    cardUpdated: 'Payment method updated.',
```

Заменить на:

```ts
    noCard: 'No card on file.',
    cardNote: 'You enter a card at checkout. We keep only its brand and last four digits.',
```

В `src/i18n/ru.ts`:

Найти:

```ts
    expires: (expiry: string) => `Действует до ${expiry}`,
    noCard: 'Карта не привязана.',
    saveCard: 'Сохранить карту',
    cancel: 'Отмена',
    updateCard: 'Изменить карту',
    addCard: 'Добавить карту',
    cardUpdated: 'Способ оплаты обновлён.',
```

Заменить на:

```ts
    noCard: 'Карта не привязана.',
    cardNote: 'Карту вы указываете при оформлении заказа. Мы храним только её тип и последние четыре цифры.',
```

В `src/i18n/en.ts`:

Найти:

```ts
    signedInNow: 'Signed in now',
```

Заменить на:

```ts

```

В `src/i18n/ru.ts`:

Найти:

```ts
    signedInNow: 'Вход выполнен сейчас',
```

Заменить на:

```ts

```

- [ ] **Step 9: Проверить, что тест проходит**

Run: `npm test -- src/api`
Expected: PASS.

- [ ] **Step 10: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 11: Commit**

```bash
git add src
git commit -m "Load the dashboard, checkout and servers from the API" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 11: Вход через Better Auth на сайте

`src/auth/` переходит на `createAuthClient` из `better-auth/react` с плагинами `twoFactor` и `admin`. `useAuth()` сохраняет форму (`user`, `signIn`, `signUp`, `signOut`, `updateUser`, `deleteAccount`), методы становятся async, добавляются `loading` и `refresh`. Старые ключи `localStorage` удаляются. Язык пользователя следует за языком страницы. Удаление аккаунта требует пароль.

**Files:**
- Create: `src/auth/client.ts`, `src/auth/authCall.ts`, `src/auth/authCall.test.ts`, `src/auth/gate.ts`, `src/auth/gate.test.ts`, `src/auth/legacy.ts`, `src/auth/legacy.test.ts`, `src/auth/useSyncUserLocale.ts`, `src/pages/dashboard/settings/ProfileCard.tsx`, `src/pages/dashboard/settings/DeleteAccountCard.tsx`
- Modify (целиком): `src/auth/context.ts`, `src/auth/AuthProvider.tsx`, `src/auth/RequireAuth.tsx`, `src/main.tsx`, `src/layout/Layout.tsx`, `src/pages/Login.tsx`, `src/pages/Signup.tsx`, `src/pages/dashboard/DashboardLayout.tsx`, `src/pages/dashboard/Settings.tsx`
- Modify: `src/components/Header.tsx`, `src/i18n/en.ts`, `src/i18n/ru.ts`

**Interfaces:**
- Consumes: `/api/auth/*` (Task 5), `PATCH /api/me` (Task 7), `ApiError`, `errorFromBody`, `apiFetch`, `errorMessage` (Task 9), `<PreferencesCard />` (Task 10).
- Produces: `authClient` (Better Auth React-клиент на `window.location.origin` + `/api/auth`).
- Produces: `authCall<T>(call: () => Promise<{ data, error }>): Promise<NonNullable<T>>` — бросает `ApiError` с кодом из ответа, `network` при обрыве.
- Produces (`context.ts`): `interface AuthUser { id; name; email; emailVerified: boolean; locale: UserLocale; role: Role; twoFactorEnabled: boolean; createdAt: string }`; `interface SignUpInput { name; email; password; locale }`; `interface AuthValue { user: AuthUser | null; loading: boolean; signIn(email, password): Promise<'ok' | 'two-factor'>; signUp(input): Promise<void>; signOut(): Promise<void>; updateUser({ name?, locale? }): Promise<void>; deleteAccount(password): Promise<void>; refresh(): Promise<void> }`. Старые типы `User`, `Device`, `Payment`, `SavedCard`, `Preferences`, `Billing` из `context.ts` удалены (замены — в `shared/api.ts`).
- Produces: `authGate({ user, loading }) → 'wait' | 'redirect' | 'show'`; `LEGACY_KEYS`, `clearLegacyStorage(getStorage)`; `useSyncUserLocale()`.
- Produces: `<ProfileCard />`, `<DeleteAccountCard />`.
- Словарь: пароль от 8 символов (`t.auth.passwordTooShort`, `t.signup.passwordPlaceholder`), новый текст `t.settings.deleteText`, новый `t.settings.deletePassword`.

- [ ] **Step 1: Написать падающие тесты**

Create `src/auth/authCall.test.ts`:

```ts
import { expect, it } from 'vitest'
import { authCall } from './authCall'

it('returns data on success', async () => {
  expect(await authCall(async () => ({ data: { ok: 1 }, error: null }))).toEqual({ ok: 1 })
})

it('maps the rewritten error body to an ApiError', async () => {
  const call = async () => ({ data: null, error: { status: 401, statusText: 'Unauthorized', error: { code: 'invalid_credentials' } } })
  await expect(authCall(call)).rejects.toMatchObject({ code: 'invalid_credentials', status: 401 })
})

it('a thrown call or a better-fetch fetch error is network', async () => {
  await expect(
    authCall(async () => {
      throw new TypeError('Failed to fetch')
    }),
  ).rejects.toMatchObject({ code: 'network' })
  await expect(authCall(async () => ({ data: null, error: { status: 500, statusText: 'Fetch Error' } }))).rejects.toMatchObject({
    code: 'network',
  })
})
```

Create `src/auth/gate.test.ts` (Review Focus 2: перезагрузка кабинета не отправляет на `/signup`):

```ts
import { expect, it } from 'vitest'
import { authGate } from './gate'

it('waits for the session instead of redirecting on reload', () => {
  expect(authGate({ user: null, loading: true })).toBe('wait')
  expect(authGate({ user: null, loading: false })).toBe('redirect')
  expect(authGate({ user: { id: '1' }, loading: false })).toBe('show')
  // A cached user stays visible while the session is re-checked.
  expect(authGate({ user: { id: '1' }, loading: true })).toBe('show')
})
```

Create `src/auth/legacy.test.ts`:

```ts
import { expect, it } from 'vitest'
import { clearLegacyStorage } from './legacy'

it('removes both demo keys and keeps the language choice', () => {
  const data = new Map([
    ['laslesvpn.session', '{}'],
    ['laslesvpn.accounts', '{}'],
    ['laslesvpn.locale', 'ru'],
  ])
  clearLegacyStorage(() => ({ removeItem: (key: string) => void data.delete(key) }))
  expect([...data.keys()]).toEqual(['laslesvpn.locale'])
})

it('survives storage that cannot be opened or written', () => {
  expect(() =>
    clearLegacyStorage(() => {
      throw new Error('SecurityError')
    }),
  ).not.toThrow()
  expect(() =>
    clearLegacyStorage(() => ({
      removeItem: () => {
        throw new Error('SecurityError')
      },
    })),
  ).not.toThrow()
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test -- src/auth`
Expected: FAIL — нет модулей `./authCall`, `./gate`, `./legacy`.

- [ ] **Step 3: Клиент и чистые функции**

Create `src/auth/client.ts`:

```ts
import { adminClient, inferAdditionalFields, twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

// Better Auth in the browser. All calls go to /api/auth on the site's own
// origin (Vite proxies /api to the API server in development).
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [
    inferAdditionalFields({ user: { locale: { type: 'string', required: false } } }),
    twoFactorClient(),
    adminClient(),
  ],
})
```

Create `src/auth/authCall.ts`:

```ts
import { ApiError, errorFromBody } from '../api/client'

// Better Auth client calls resolve to { data, error }. Our server rewrites
// every auth error body to { error: { code } }, which better-fetch spreads
// into `error` next to `status`.
type AuthResult<T> = { data: T; error: null } | { data: null; error: { status: number } }

export async function authCall<T>(call: () => Promise<AuthResult<T>>): Promise<NonNullable<T>> {
  let result: AuthResult<T>
  try {
    result = await call()
  } catch {
    throw new ApiError('network', 0)
  }
  if (result.error) {
    // better-fetch reports a failed connection as a 500 with statusText "Fetch Error".
    if ((result.error as { statusText?: string }).statusText === 'Fetch Error') throw new ApiError('network', 0)
    throw errorFromBody(result.error.status, result.error)
  }
  // Every endpoint we call answers a success with a body.
  if (result.data === null || result.data === undefined) throw new ApiError('server_error', 0)
  return result.data
}
```

Create `src/auth/gate.ts`:

```ts
// What a protected page does for the current auth state. While the session
// is still loading it must wait: redirecting then would bounce a signed-in
// visitor to the sign-up page on every reload.
export function authGate({ user, loading }: { user: unknown; loading: boolean }): 'wait' | 'redirect' | 'show' {
  if (user) return 'show'
  return loading ? 'wait' : 'redirect'
}
```

Create `src/auth/legacy.ts`:

```ts
// The localStorage demo kept accounts in these keys. They are removed on the
// first run of the server-backed version; old demo accounts are not migrated.
export const LEGACY_KEYS = ['laslesvpn.session', 'laslesvpn.accounts'] as const

// Storage can be unavailable (private mode): even reading window.localStorage
// may throw, so the getter is called inside the try.
export function clearLegacyStorage(getStorage: () => Pick<Storage, 'removeItem'>) {
  try {
    const storage = getStorage()
    for (const key of LEGACY_KEYS) storage.removeItem(key)
  } catch {
    // Nothing to clean up then.
  }
}
```

- [ ] **Step 4: Провайдер, контекст, защита страниц**

Replace `src/auth/context.ts`:

```ts
import { createContext } from 'react'
import type { Role, UserLocale } from '../../shared/api'

// The signed-in user as the session reports it. Plan, devices and payments
// come from the API (src/api/useApi.ts), not from here.
export interface AuthUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  locale: UserLocale
  role: Role
  twoFactorEnabled: boolean
  createdAt: string
}

export interface SignUpInput {
  name: string
  email: string
  password: string
  locale: UserLocale
}

export interface AuthValue {
  user: AuthUser | null
  // True until the first session check finishes; nothing should redirect before that.
  loading: boolean
  // 'two-factor' means the password was right and /login/2fa must finish the sign-in.
  signIn: (email: string, password: string) => Promise<'ok' | 'two-factor'>
  signUp: (input: SignUpInput) => Promise<void>
  signOut: () => Promise<void>
  updateUser: (patch: { name?: string; locale?: UserLocale }) => Promise<void>
  deleteAccount: (password: string) => Promise<void>
  // Re-reads the session after something changed it elsewhere (email confirmed, 2FA on).
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)
```

Replace `src/auth/AuthProvider.tsx`:

```tsx
import { useCallback, useMemo, type ReactNode } from 'react'
import { apiFetch } from '../api/client'
import type { Role } from '../../shared/api'
import { authCall } from './authCall'
import { authClient } from './client'
import { AuthContext, type AuthUser, type AuthValue } from './context'

type SessionUser = NonNullable<ReturnType<typeof authClient.useSession>['data']>['user']

function toAuthUser(user: SessionUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    locale: user.locale === 'ru' ? 'ru' : 'en',
    role: (user.role ?? 'customer') as Role,
    twoFactorEnabled: user.twoFactorEnabled === true,
    createdAt: new Date(user.createdAt).toISOString(),
  }
}

// The session lives in an httpOnly cookie set by the API; this provider only
// mirrors it. Better Auth refreshes `useSession` after sign-in, sign-out and
// the other auth calls on its own.
export function AuthProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession()
  const { refetch } = session
  const user = useMemo(() => (session.data ? toAuthUser(session.data.user) : null), [session.data])

  const refresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const signIn = useCallback<AuthValue['signIn']>(async (email, password) => {
    const data = await authCall(() => authClient.signIn.email({ email, password }))
    return 'twoFactorRedirect' in data && data.twoFactorRedirect ? 'two-factor' : 'ok'
  }, [])

  const signUp = useCallback<AuthValue['signUp']>(async ({ name, email, password, locale }) => {
    await authCall(() => authClient.signUp.email({ name, email, password, locale }))
  }, [])

  const signOut = useCallback(async () => {
    await authCall(() => authClient.signOut())
  }, [])

  const updateUser = useCallback<AuthValue['updateUser']>(
    async (patch) => {
      await apiFetch('/api/me', { method: 'PATCH', body: patch })
      await refetch()
    },
    [refetch],
  )

  // Better Auth re-reads the session by itself after sign-out and deletion.
  const deleteAccount = useCallback(async (password: string) => {
    await authCall(() => authClient.deleteUser({ password }))
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ user, loading: session.isPending, signIn, signUp, signOut, updateUser, deleteAccount, refresh }),
    [user, session.isPending, signIn, signUp, signOut, updateUser, deleteAccount, refresh],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
```

Replace `src/auth/RequireAuth.tsx`:

```tsx
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { LocalNavigate } from '../i18n/LocalLink'
import { useT } from '../i18n/useT'
import { authGate } from './gate'
import { useAuth } from './useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  const t = useT()

  switch (authGate(auth)) {
    case 'wait':
      return (
        <p className="container form-note" role="status">
          {t.common.loading}
        </p>
      )
    case 'redirect': {
      const next = location.pathname + location.search
      return <LocalNavigate to={`/signup?next=${encodeURIComponent(next)}`} replace />
    }
    case 'show':
      return children
  }
}
```

Create `src/auth/useSyncUserLocale.ts`:

```ts
import { useEffect } from 'react'
import { useLocale } from '../i18n/useLocale'
import { useAuth } from './useAuth'

// Emails go out in user.locale. Whenever a signed-in user browses the site in
// the other language, the account follows the language of the page.
export function useSyncUserLocale() {
  const { user, updateUser } = useAuth()
  const locale = useLocale()
  const stale = user !== null && user.locale !== locale

  useEffect(() => {
    if (!stale) return
    updateUser({ locale }).catch(() => {
      // Not worth bothering the visitor: the next page view tries again.
    })
  }, [stale, locale, updateUser])
}
```

Replace `src/layout/Layout.tsx`:

```tsx
import { Outlet } from 'react-router'
import { useSyncUserLocale } from '../auth/useSyncUserLocale'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { ScrollManager } from './ScrollManager'

export function Layout() {
  useSyncUserLocale()
  return (
    <>
      <ScrollManager />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
```

Replace `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { clearLegacyStorage } from './auth/legacy'
import { initialRedirect } from './i18n/locales'
import { readStoredLocale } from './i18n/storage'
import './index.css'
import App from './App.tsx'

// The localStorage demo accounts are gone for good (see src/auth/legacy.ts).
clearLegacyStorage(() => window.localStorage)

// Runs once before the first render, so in-app navigation to "/" is never redirected.
const redirect = initialRedirect(window.location, readStoredLocale())
if (redirect) window.history.replaceState(null, '', redirect)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

В `src/components/Header.tsx` (пока сессия грузится, блок входа пуст, без мигания «Войти»):

Найти:

```ts
  const { user } = useAuth()
```

Заменить на:

```ts
  const { user, loading } = useAuth()
```

Найти:

```tsx
          {user ? (
```

Заменить на:

```tsx
          {loading ? null : user ? (
```

- [ ] **Step 5: Вход, регистрация, выход**

Replace `src/pages/Login.tsx` (ссылку «Забыли пароль?» заменит Task 12, кнопку Google добавит Task 14):

```tsx
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../api/errorMessage'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { safeNext } from '../auth/next'
import { useAuth } from '../auth/useAuth'
import { message, useT, type Message } from '../i18n/useT'
import { usePageMeta } from '../i18n/usePageMeta'

export function Login() {
  const t = useT()
  usePageMeta(t.login.metaTitle)
  const { signIn } = useAuth()
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    setBusy(true)
    try {
      const result = await signIn(email, password)
      if (result === 'two-factor') navigate(`/login/2fa?next=${encodeURIComponent(next)}`, { replace: true })
      else navigate(next, { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.login.title}</h1>
        <p className="auth-subtitle">{t.login.subtitle}</p>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{t.auth.email}</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={t.auth.emailPlaceholder}
            />
          </label>
          <label className="field">
            <span>{t.auth.password}</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={() => setError(null)}
            />
          </label>
          {error && <p className="form-error">{error(t)}</p>}
          <button type="button" className="link-button" onClick={() => setResetSent(true)}>
            {t.login.forgot}
          </button>
          {resetSent && <p className="form-note">{t.login.resetSent}</p>}
          <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
            {t.login.submit}
          </button>
        </form>

        <p className="auth-switch">
          {t.login.newHere}{' '}
          <LocalLink to={`/signup?next=${encodeURIComponent(next)}`}>{t.login.createAccount}</LocalLink>
        </p>
      </div>
    </section>
  )
}
```

Replace `src/pages/Signup.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../api/errorMessage'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { safeNext } from '../auth/next'
import { useAuth } from '../auth/useAuth'
import { useLocale } from '../i18n/useLocale'
import { message, useT, type Message } from '../i18n/useT'
import { usePageMeta } from '../i18n/usePageMeta'

export function Signup() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.signup.metaTitle)
  const { signUp } = useAuth()
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'), '/checkout')
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name')).trim()
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    if (password.length < 8) {
      setError(message((t) => t.auth.passwordTooShort))
      return
    }
    setBusy(true)
    try {
      // The confirmation email goes out in the language of this page.
      await signUp({ name, email, password, locale })
      navigate(next, { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.signup.title}</h1>
        <p className="auth-subtitle">{t.signup.subtitle}</p>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{t.signup.fullName}</span>
            <input name="name" required autoComplete="name" placeholder={t.signup.namePlaceholder} />
          </label>
          <label className="field">
            <span>{t.auth.email}</span>
            <input name="email" type="email" required autoComplete="email" placeholder={t.auth.emailPlaceholder} />
          </label>
          <label className="field">
            <span>{t.auth.password}</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder={t.signup.passwordPlaceholder}
              onChange={() => setError(null)}
            />
          </label>
          {error && <p className="form-error">{error(t)}</p>}
          <label className="checkbox">
            <input type="checkbox" required />
            <span>
              {t.signup.agreeBefore}
              <LocalLink to="/terms">{t.signup.terms}</LocalLink>
              {t.signup.agreeMiddle}
              <LocalLink to="/privacy">{t.signup.privacy}</LocalLink>
            </span>
          </label>
          <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
            {t.signup.submit}
          </button>
        </form>

        <p className="auth-switch">
          {t.signup.haveAccount}
          <LocalLink to={`/login?next=${encodeURIComponent(next)}`}>{t.signup.signIn}</LocalLink>
        </p>
      </div>
    </section>
  )
}
```

Replace `src/pages/dashboard/DashboardLayout.tsx`:

```tsx
import { Outlet } from 'react-router'
import { LocalNavLink } from '../../i18n/LocalLink'
import { useLocalNavigate } from '../../i18n/useLocalNavigate'
import { useT } from '../../i18n/useT'
import { useAuth } from '../../auth/useAuth'

export function DashboardLayout() {
  const { user, signOut } = useAuth()
  const navigate = useLocalNavigate()
  const t = useT()

  if (!user) return null

  const tabs = [
    { to: '/dashboard', label: t.dashboard.tabs.overview, end: true },
    { to: '/dashboard/devices', label: t.dashboard.tabs.devices },
    { to: '/dashboard/billing', label: t.dashboard.tabs.billing },
    { to: '/dashboard/settings', label: t.dashboard.tabs.settings },
  ]

  async function handleSignOut() {
    try {
      await signOut()
    } finally {
      // Better Auth re-reads the session only after another request, so this
      // navigation lands before RequireAuth could send us to /signup.
      navigate('/')
    }
  }

  return (
    <section className="dashboard container">
      <div className="dashboard-head">
        <div>
          <p className="eyebrow">{t.dashboard.eyebrow}</p>
          <h1 className="section-title">{t.dashboard.greeting(user.name.split(' ')[0])}</h1>
        </div>
        <button type="button" className="btn btn-outline" onClick={handleSignOut}>
          {t.dashboard.signOut}
        </button>
      </div>

      <nav className="dashboard-tabs" aria-label={t.dashboard.navLabel}>
        {tabs.map((tab) => (
          <LocalNavLink key={tab.to} to={tab.to} end={tab.end}>
            {tab.label}
          </LocalNavLink>
        ))}
      </nav>

      <Outlet />
    </section>
  )
}
```

- [ ] **Step 6: Профиль и удаление аккаунта**

Create `src/pages/dashboard/settings/ProfileCard.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../../api/errorMessage'
import { useAuth } from '../../../auth/useAuth'
import { message, useT, type Message } from '../../../i18n/useT'

export function ProfileCard() {
  const t = useT()
  const { user, updateUser } = useAuth()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = String(new FormData(e.currentTarget).get('name')).trim()
    if (!name) return setError(message((t) => t.settings.enterName))
    setBusy(true)
    try {
      await updateUser({ name })
      setSaved(true)
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card account-card">
      <h2 className="card-title">{t.settings.profile}</h2>
      <form
        className="form"
        noValidate
        onSubmit={handleSubmit}
        onChange={() => {
          setSaved(false)
          setError(null)
        }}
      >
        <label className="field">
          <span>{t.signup.fullName}</span>
          <input name="name" defaultValue={user.name} autoComplete="name" maxLength={80} required />
        </label>
        {error && <p className="form-error">{error(t)}</p>}
        <button type="submit" className="btn btn-outline" disabled={busy}>
          {saved ? t.settings.saved : t.settings.saveChanges}
        </button>
      </form>
    </div>
  )
}
```

Create `src/pages/dashboard/settings/DeleteAccountCard.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../../api/errorMessage'
import { useAuth } from '../../../auth/useAuth'
import { useLocalNavigate } from '../../../i18n/useLocalNavigate'
import { message, useT, type Message } from '../../../i18n/useT'

export function DeleteAccountCard() {
  const t = useT()
  const { deleteAccount } = useAuth()
  const navigate = useLocalNavigate()
  const [word, setWord] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await deleteAccount(password)
      // The session is re-read only after another request, so this navigation
      // lands before RequireAuth could send the visitor to /signup.
      navigate('/', { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <div className="card account-card danger-zone">
      <h2 className="card-title">{t.settings.deleteTitle}</h2>
      <p>{t.settings.deleteText}</p>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>
            {t.settings.typeBefore}
            <b>{t.settings.deleteWord}</b>
            {t.settings.typeAfter}
          </span>
          <input value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" />
        </label>
        <label className="field">
          <span>{t.settings.deletePassword}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="form-error">{error(t)}</p>}
        <button type="submit" className="btn btn-danger" disabled={busy || word !== t.settings.deleteWord || !password}>
          {t.settings.deleteButton}
        </button>
      </form>
    </div>
  )
}
```

Replace `src/pages/dashboard/Settings.tsx` (демо-форма пароля уходит, настоящую вернёт Task 15):

```tsx
import { usePageMeta } from '../../i18n/usePageMeta'
import { useT } from '../../i18n/useT'
import { DeleteAccountCard } from './settings/DeleteAccountCard'
import { PreferencesCard } from './settings/PreferencesCard'
import { ProfileCard } from './settings/ProfileCard'

export function Settings() {
  const t = useT()
  usePageMeta(t.settings.metaTitle)

  return (
    <div className="account-section account-grid">
      <ProfileCard />
      <PreferencesCard />
      <DeleteAccountCard />
    </div>
  )
}
```

- [ ] **Step 7: Тексты**

В `src/i18n/en.ts`:

Найти:

```ts
passwordTooShort: 'Password must be at least 6 characters.',
```

Заменить на:

```ts
passwordTooShort: 'Password must be at least 8 characters.',
```

В `src/i18n/ru.ts`:

Найти:

```ts
passwordTooShort: 'Пароль должен содержать не менее 6 символов.',
```

Заменить на:

```ts
passwordTooShort: 'Пароль должен содержать не менее 8 символов.',
```

В `src/i18n/en.ts`:

Найти:

```ts
passwordPlaceholder: 'At least 6 characters',
```

Заменить на:

```ts
passwordPlaceholder: 'At least 8 characters',
```

В `src/i18n/ru.ts`:

Найти:

```ts
passwordPlaceholder: 'Не менее 6 символов',
```

Заменить на:

```ts
passwordPlaceholder: 'Не менее 8 символов',
```

В `src/i18n/en.ts`:

Найти:

```ts
    deleteText:
      "This removes your profile, devices and payment history from this browser and signs you out. It can't be undone.",
```

Заменить на:

```ts
    deleteText:
      "This permanently removes your profile, devices, subscription and payment history and signs you out everywhere. It can't be undone.",
    deletePassword: 'Your password',
```

В `src/i18n/ru.ts`:

Найти:

```ts
    deleteText:
      'Это удалит ваш профиль, устройства и историю платежей из этого браузера и завершит сеанс. Отменить это действие нельзя.',
```

Заменить на:

```ts
    deleteText:
      'Это навсегда удалит ваш профиль, устройства, подписку и историю платежей и завершит все сеансы. Отменить это действие нельзя.',
    deletePassword: 'Ваш пароль',
```

- [ ] **Step 8: Проверить, что тесты проходят**

Run: `npm test -- src/auth`
Expected: PASS.

- [ ] **Step 9: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 10: Ручная проверка**

`npm run db:reset && npm run dev`, затем в браузере на `http://localhost:5173`:
1. В DevTools → Application → Local Storage создать ключи `laslesvpn.session` и `laslesvpn.accounts`, перезагрузить: оба исчезли, `laslesvpn.locale` остался.
2. `/signup` → регистрация → `/checkout`. Перезагрузка `/dashboard` показывает «Загрузка…», потом кабинет, без перехода на `/signup`. Cookie `better-auth.session_token`: HttpOnly, SameSite=Lax.
3. Неверный пароль на `/login` → «Неверный email или пароль.» / «Wrong email or password.».
4. Вход `demo@laslesvpn.test` / `demo-password`: Обзор, Устройства (2), Оплата (3 платежа по $9.00), переключатели в Настройках сохраняются после перезагрузки.
5. Открыть `/ru/dashboard`: во вкладке Network один раз уходит `PATCH /api/me` с `{"locale":"ru"}`, при повторных переходах по `/ru` — больше нет.
6. «Выйти» → главная.

- [ ] **Step 11: Commit**

```bash
git add src
git commit -m "Sign in through Better Auth and drop the localStorage accounts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 12: Письма на сайте: забыли пароль, новый пароль, подтверждение email, `/dev/mail`

Страницы `/forgot-password`, `/reset-password`, `/verify-email` и `/dev/mail` (только при `devMail: true`) на обоих языках; плашка «Подтвердите email» с «Отправить ещё раз» в кабинете и на оформлении заказа; после сброса — вход с подставленным email.

**Files:**
- Create: `src/auth/verify.ts`, `src/auth/verify.test.ts`, `src/auth/ui/VerifyEmailNotice.tsx`, `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/VerifyEmail.tsx`, `src/pages/DevMail.tsx`
- Modify (целиком): `src/pages/Login.tsx`, `src/pages/dashboard/DashboardLayout.tsx`
- Modify: `src/pages/Checkout.tsx`, `src/App.tsx`, `src/pages/pages.css`, `src/i18n/en.ts`, `src/i18n/ru.ts`

**Interfaces:**
- Consumes: `authClient.requestPasswordReset`, `resetPassword`, `verifyEmail`, `sendVerificationEmail` через `authCall` (Task 11); `useConfig`, `useApi`, `ApiState` (Task 9); `DevMail` (Task 1); ссылки из писем (Task 5).
- Produces: `verifyOutcome(error: unknown): 'expired' | 'invalid'`; `<VerifyEmailNotice />` (ничего не рисует для подтверждённого email).
- Produces (маршруты под `/` и `/ru`): `forgot-password`, `reset-password`, `verify-email`, `dev/mail`.
- `Login` читает `?email=` (подставляет в поле) и `?reset=1` (показывает «Пароль изменён»).
- Словарь: новые секции `forgot`, `reset`, `verify`, `verifyNotice`, `devMail`; `t.login.passwordChanged`; удалён `t.login.resetSent`.

- [ ] **Step 1: Написать падающий тест**

Create `src/auth/verify.test.ts`:

```ts
import { expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { verifyOutcome } from './verify'

it('tells an expired link from a broken one', () => {
  expect(verifyOutcome(new ApiError('token_expired', 401))).toBe('expired')
  expect(verifyOutcome(new ApiError('token_invalid', 401))).toBe('invalid')
  expect(verifyOutcome(new ApiError('network', 0))).toBe('invalid')
  expect(verifyOutcome(new Error('boom'))).toBe('invalid')
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test -- src/auth/verify.test.ts`
Expected: FAIL — нет модуля `./verify`.

- [ ] **Step 3: Подтверждение email**

Create `src/auth/verify.ts`:

```ts
import { toApiError } from '../api/client'

// Which failure page a confirmation link gets: only token_expired is
// "expired"; anything else (used, garbled, unknown user) is "invalid".
export function verifyOutcome(error: unknown): 'expired' | 'invalid' {
  return toApiError(error).code === 'token_expired' ? 'expired' : 'invalid'
}
```

Create `src/pages/VerifyEmail.tsx`. Ссылка одна и для подтверждения регистрации, и для нового адреса (Task 15). Ref-защита нужна из-за StrictMode: второй вызов с токеном смены email уже не найдёт старый адрес и показал бы «ссылка недействительна».

```tsx
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { authCall } from '../auth/authCall'
import { authClient } from '../auth/client'
import { useAuth } from '../auth/useAuth'
import { verifyOutcome } from '../auth/verify'
import { LocalLink } from '../i18n/LocalLink'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

type Result = 'checking' | 'success' | 'expired' | 'invalid'

// Opened from a confirmation email (sign-up or a new address).
export function VerifyEmail() {
  const t = useT()
  usePageMeta(t.verify.metaTitle)
  const { user } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [result, setResult] = useState<Result>(token ? 'checking' : 'invalid')
  // StrictMode runs effects twice in development; an email-change token must
  // be sent only once (the second call would no longer find the old address).
  const sent = useRef(false)

  useEffect(() => {
    if (!token || sent.current) return
    sent.current = true
    authCall(() => authClient.verifyEmail({ query: { token } })).then(
      () => setResult('success'),
      (err: unknown) => setResult(verifyOutcome(err)),
    )
  }, [token])

  const copy = {
    checking: { title: t.verify.checking, text: '' },
    success: { title: t.verify.successTitle, text: t.verify.successText },
    expired: { title: t.verify.expiredTitle, text: t.verify.expiredText },
    invalid: { title: t.verify.invalidTitle, text: t.verify.invalidText },
  }[result]

  return (
    <section className="auth container">
      <div className="auth-card" role="status">
        <h1 className="auth-title">{copy.title}</h1>
        {copy.text && <p className="auth-subtitle">{copy.text}</p>}
        {result !== 'checking' && (
          <LocalLink to={user ? '/dashboard' : '/login'} className="btn btn-primary form-submit">
            {user ? t.verify.toDashboard : t.verify.toLogin}
          </LocalLink>
        )}
      </div>
    </section>
  )
}
```

Create `src/auth/ui/VerifyEmailNotice.tsx`:

```tsx
import { useState } from 'react'
import { errorMessage } from '../../api/errorMessage'
import { message, useT, type Message } from '../../i18n/useT'
import { authCall } from '../authCall'
import { authClient } from '../client'
import { useAuth } from '../useAuth'

// "Confirm your email" banner with a resend button, for signed-in users whose
// email is not confirmed yet. Renders nothing otherwise.
export function VerifyEmailNotice() {
  const t = useT()
  const { user } = useAuth()
  const [status, setStatus] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  if (!user || user.emailVerified) return null
  const email = user.email

  async function resend() {
    setBusy(true)
    try {
      await authCall(() => authClient.sendVerificationEmail({ email }))
      setStatus(message((t) => t.verifyNotice.sent))
    } catch (err) {
      setStatus(message((t) => errorMessage(t, err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="notice" role="status">
      <p>
        {t.verifyNotice.textBefore}
        <b>{email}</b>
        {t.verifyNotice.textAfter}
        {status && (
          <>
            {' '}
            {status(t)}
          </>
        )}
      </p>
      <button type="button" className="btn btn-outline" onClick={resend} disabled={busy}>
        {t.verifyNotice.resend}
      </button>
    </div>
  )
}
```

Replace `src/pages/dashboard/DashboardLayout.tsx` (добавлена плашка):

```tsx
import { Outlet } from 'react-router'
import { LocalNavLink } from '../../i18n/LocalLink'
import { useLocalNavigate } from '../../i18n/useLocalNavigate'
import { useT } from '../../i18n/useT'
import { VerifyEmailNotice } from '../../auth/ui/VerifyEmailNotice'
import { useAuth } from '../../auth/useAuth'

export function DashboardLayout() {
  const { user, signOut } = useAuth()
  const navigate = useLocalNavigate()
  const t = useT()

  if (!user) return null

  const tabs = [
    { to: '/dashboard', label: t.dashboard.tabs.overview, end: true },
    { to: '/dashboard/devices', label: t.dashboard.tabs.devices },
    { to: '/dashboard/billing', label: t.dashboard.tabs.billing },
    { to: '/dashboard/settings', label: t.dashboard.tabs.settings },
  ]

  async function handleSignOut() {
    try {
      await signOut()
    } finally {
      // Better Auth re-reads the session only after another request, so this
      // navigation lands before RequireAuth could send us to /signup.
      navigate('/')
    }
  }

  return (
    <section className="dashboard container">
      <div className="dashboard-head">
        <div>
          <p className="eyebrow">{t.dashboard.eyebrow}</p>
          <h1 className="section-title">{t.dashboard.greeting(user.name.split(' ')[0])}</h1>
        </div>
        <button type="button" className="btn btn-outline" onClick={handleSignOut}>
          {t.dashboard.signOut}
        </button>
      </div>

      <VerifyEmailNotice />

      <nav className="dashboard-tabs" aria-label={t.dashboard.navLabel}>
        {tabs.map((tab) => (
          <LocalNavLink key={tab.to} to={tab.to} end={tab.end}>
            {tab.label}
          </LocalNavLink>
        ))}
      </nav>

      <Outlet />
    </section>
  )
}
```

В `src/pages/Checkout.tsx`:

Найти:

```tsx
import { useAuth } from '../auth/useAuth'
```

Заменить на:

```tsx
import { VerifyEmailNotice } from '../auth/ui/VerifyEmailNotice'
import { useAuth } from '../auth/useAuth'
```

Найти:

```tsx
        {t.checkout.signedInAfter}
      </p>
```

Заменить на:

```tsx
        {t.checkout.signedInAfter}
      </p>
      <VerifyEmailNotice />
```

- [ ] **Step 4: Сброс пароля**

Create `src/pages/ForgotPassword.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { errorMessage } from '../api/errorMessage'
import { authCall } from '../auth/authCall'
import { authClient } from '../auth/client'
import { LocalLink } from '../i18n/LocalLink'
import { usePageMeta } from '../i18n/usePageMeta'
import { message, useT, type Message } from '../i18n/useT'

export function ForgotPassword() {
  const t = useT()
  usePageMeta(t.forgot.metaTitle)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email')).trim()
    setBusy(true)
    setError(null)
    try {
      // The answer is the same whether or not the account exists.
      await authCall(() => authClient.requestPasswordReset({ email }))
      setSent(true)
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.forgot.title}</h1>
        <p className="auth-subtitle">{t.forgot.subtitle}</p>
        {sent ? (
          <p className="form-note" role="status">
            {t.forgot.sent}
          </p>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <label className="field">
              <span>{t.auth.email}</span>
              <input name="email" type="email" required autoComplete="email" placeholder={t.auth.emailPlaceholder} />
            </label>
            {error && <p className="form-error">{error(t)}</p>}
            <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
              {t.forgot.submit}
            </button>
          </form>
        )}
        <p className="auth-switch">
          <LocalLink to="/login">{t.forgot.backToLogin}</LocalLink>
        </p>
      </div>
    </section>
  )
}
```

Create `src/pages/ResetPassword.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../api/errorMessage'
import { authCall } from '../auth/authCall'
import { authClient } from '../auth/client'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { usePageMeta } from '../i18n/usePageMeta'
import { message, useT, type Message } from '../i18n/useT'

// Opened from the reset email: /reset-password?token=…&email=…
export function ResetPassword() {
  const t = useT()
  usePageMeta(t.reset.metaTitle)
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')
  const email = params.get('email') ?? ''
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) return
    const data = new FormData(e.currentTarget)
    const newPassword = String(data.get('next'))
    if (newPassword.length < 8) return setError(message((t) => t.auth.passwordTooShort))
    if (newPassword !== String(data.get('confirm'))) return setError(message((t) => t.settings.mismatch))
    setBusy(true)
    try {
      await authCall(() => authClient.resetPassword({ token, newPassword }))
      // Every session was revoked; sign in again with the new password.
      navigate(`/login?reset=1&email=${encodeURIComponent(email)}`, { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.reset.title}</h1>
        {token ? (
          <>
            <p className="auth-subtitle">{t.reset.subtitle}</p>
            <form className="form" onSubmit={handleSubmit} onChange={() => setError(null)}>
              <label className="field">
                <span>{t.settings.newPassword}</span>
                <input name="next" type="password" required autoComplete="new-password" placeholder={t.signup.passwordPlaceholder} />
              </label>
              <label className="field">
                <span>{t.settings.confirm}</span>
                <input name="confirm" type="password" required autoComplete="new-password" />
              </label>
              {error && <p className="form-error">{error(t)}</p>}
              <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
                {t.reset.submit}
              </button>
            </form>
          </>
        ) : (
          <p className="form-error">{t.reset.missingToken}</p>
        )}
        <p className="auth-switch">
          <LocalLink to="/forgot-password">{t.reset.requestNew}</LocalLink>
        </p>
      </div>
    </section>
  )
}
```

Replace `src/pages/Login.tsx` (настоящая ссылка «Забыли пароль?», подстановка email и сообщение после сброса):

```tsx
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../api/errorMessage'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { safeNext } from '../auth/next'
import { useAuth } from '../auth/useAuth'
import { message, useT, type Message } from '../i18n/useT'
import { usePageMeta } from '../i18n/usePageMeta'

export function Login() {
  const t = useT()
  usePageMeta(t.login.metaTitle)
  const { signIn } = useAuth()
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  // After a password reset the email is passed along so it does not need retyping.
  const presetEmail = params.get('email') ?? ''
  const afterReset = params.get('reset') === '1'
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    setBusy(true)
    try {
      const result = await signIn(email, password)
      if (result === 'two-factor') navigate(`/login/2fa?next=${encodeURIComponent(next)}`, { replace: true })
      else navigate(next, { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.login.title}</h1>
        <p className="auth-subtitle">{t.login.subtitle}</p>
        {afterReset && (
          <p className="form-note" role="status">
            {t.login.passwordChanged}
          </p>
        )}

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{t.auth.email}</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={t.auth.emailPlaceholder}
              defaultValue={presetEmail}
            />
          </label>
          <label className="field">
            <span>{t.auth.password}</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={() => setError(null)}
            />
          </label>
          {error && <p className="form-error">{error(t)}</p>}
          <LocalLink to="/forgot-password" className="link-button">
            {t.login.forgot}
          </LocalLink>
          <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
            {t.login.submit}
          </button>
        </form>

        <p className="auth-switch">
          {t.login.newHere}{' '}
          <LocalLink to={`/signup?next=${encodeURIComponent(next)}`}>{t.login.createAccount}</LocalLink>
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: `/dev/mail`**

Create `src/pages/DevMail.tsx`:

```tsx
import type { DevMail as Mail } from '../../shared/api'
import { ApiState } from '../api/ApiState'
import { useApi, useConfig } from '../api/useApi'
import { formatDate } from '../i18n/format'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'
import { NotFound } from './NotFound'

// Splits a plain-text mail into text and clickable links.
function linkify(text: string) {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    i % 2 ? (
      <a key={i} href={part}>
        {part}
      </a>
    ) : (
      part
    ),
  )
}

// Development only: the mail the API would have sent. Hidden unless /api/config says devMail.
export function DevMail() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.devMail.metaTitle)
  const config = useConfig()
  const mails = useApi<Mail[]>(config.data?.devMail ? '/api/dev/mail' : null)

  if (config.data && !config.data.devMail) return <NotFound />

  return (
    <section className="dev-mail container">
      <h1 className="section-title">{t.devMail.title}</h1>
      <p>{t.devMail.text}</p>
      <button type="button" className="btn btn-outline" onClick={mails.reload}>
        {t.devMail.refresh}
      </button>
      {!mails.data ? (
        <ApiState error={config.error ?? mails.error} onRetry={config.error ? config.reload : mails.reload} />
      ) : mails.data.length === 0 ? (
        <p>{t.devMail.empty}</p>
      ) : (
        <ul className="dev-mail-list">
          {mails.data.map((mail) => (
            <li key={mail.id} className="card">
              <h2 className="card-title">{mail.subject}</h2>
              <p className="device-meta">
                {t.devMail.to} {mail.to} · {formatDate(mail.createdAt, locale)}
              </p>
              <pre className="dev-mail-text">{linkify(mail.text)}</pre>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

В `src/pages/pages.css`:

Найти:

```css
/* ---------- Responsive ---------- */
```

Заменить на:

```css
/* ---------- Sign-in extras ---------- */
.dev-mail {
  padding-top: 48px;
  padding-bottom: 96px;
}

.dev-mail-list {
  display: grid;
  gap: 16px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}

.dev-mail-text {
  margin: 12px 0 0;
  font: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* ---------- Responsive ---------- */
```

- [ ] **Step 6: Маршруты**

В `src/App.tsx`:

Найти:

```tsx
import { Login } from './pages/Login'
```

Заменить на:

```tsx
import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { VerifyEmail } from './pages/VerifyEmail'
import { DevMail } from './pages/DevMail'
```

Найти:

```tsx
      <Route path="login" element={<Login />} />
```

Заменить на:

```tsx
      <Route path="login" element={<Login />} />
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="reset-password" element={<ResetPassword />} />
      <Route path="verify-email" element={<VerifyEmail />} />
      <Route path="dev/mail" element={<DevMail />} />
```

- [ ] **Step 7: Тексты**

В `src/i18n/en.ts`:

Найти:

```ts
    resetSent: "If an account exists, we've sent a reset link to your email.",
```

Заменить на:

```ts
    passwordChanged: 'Password changed. Sign in with your new password.',
```

В `src/i18n/ru.ts`:

Найти:

```ts
    resetSent: 'Если аккаунт существует, мы отправили ссылку для сброса пароля на вашу почту.',
```

Заменить на:

```ts
    passwordChanged: 'Пароль изменён. Войдите с новым паролем.',
```

В `src/i18n/en.ts`:

Найти:

```ts
  signup: {
    metaTitle: 'Sign Up',
```

Заменить на:

```ts
  forgot: {
    metaTitle: 'Forgot Password',
    title: 'Forgot your password?',
    subtitle: "Enter your account email and we'll send you a link to choose a new password.",
    submit: 'Send Link',
    sent: "If an account with this email exists, we've sent a reset link. It works for 1 hour.",
    backToLogin: 'Back to sign in',
  },
  reset: {
    metaTitle: 'New Password',
    title: 'Choose a new password',
    subtitle: "After the change you'll be signed out on every device.",
    submit: 'Save Password',
    missingToken: 'This link is incomplete. Open the link from the email again or request a new one.',
    requestNew: 'Request a new link',
  },
  verify: {
    metaTitle: 'Email Confirmation',
    checking: 'Checking your link…',
    successTitle: 'Email confirmed',
    successText: 'Thank you! Your email address is confirmed.',
    expiredTitle: 'The link has expired',
    expiredText: 'Confirmation links work for 24 hours. Sign in and send a new one from your account.',
    invalidTitle: 'The link is invalid',
    invalidText: 'It may have been used already or copied incompletely.',
    toDashboard: 'Go to My Account',
    toLogin: 'Sign In',
  },
  verifyNotice: {
    textBefore: 'Confirm your email: we sent a link to ',
    textAfter: '.',
    resend: 'Send Again',
    sent: 'Sent! Check your inbox.',
  },
  devMail: {
    metaTitle: 'Dev Mail',
    title: 'Outgoing mail (development)',
    text: "In development, emails aren't sent. They are shown here instead, newest first.",
    to: 'To:',
    empty: 'No emails yet.',
    refresh: 'Refresh',
  },
  signup: {
    metaTitle: 'Sign Up',
```

В `src/i18n/ru.ts`:

Найти:

```ts
  signup: {
    metaTitle: 'Регистрация',
```

Заменить на:

```ts
  forgot: {
    metaTitle: 'Восстановление пароля',
    title: 'Забыли пароль?',
    subtitle: 'Укажите email аккаунта, и мы пришлём ссылку для смены пароля.',
    submit: 'Отправить ссылку',
    sent: 'Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля. Она действует 1 час.',
    backToLogin: 'Вернуться ко входу',
  },
  reset: {
    metaTitle: 'Новый пароль',
    title: 'Придумайте новый пароль',
    subtitle: 'После смены пароля вы выйдете из аккаунта на всех устройствах.',
    submit: 'Сохранить пароль',
    missingToken: 'Ссылка неполная. Откройте ссылку из письма ещё раз или запросите новую.',
    requestNew: 'Запросить новую ссылку',
  },
  verify: {
    metaTitle: 'Подтверждение email',
    checking: 'Проверяем ссылку…',
    successTitle: 'Email подтверждён',
    successText: 'Спасибо! Ваш адрес электронной почты подтверждён.',
    expiredTitle: 'Срок действия ссылки истёк',
    expiredText: 'Ссылка для подтверждения действует 24 часа. Войдите и отправьте новую из личного кабинета.',
    invalidTitle: 'Ссылка недействительна',
    invalidText: 'Возможно, она уже использована или скопирована не полностью.',
    toDashboard: 'Перейти в личный кабинет',
    toLogin: 'Войти',
  },
  verifyNotice: {
    textBefore: 'Подтвердите email: мы отправили ссылку на ',
    textAfter: '.',
    resend: 'Отправить ещё раз',
    sent: 'Отправили! Проверьте почту.',
  },
  devMail: {
    metaTitle: 'Тестовая почта',
    title: 'Исходящие письма (разработка)',
    text: 'В режиме разработки письма не отправляются, а показываются здесь. Новые сверху.',
    to: 'Кому:',
    empty: 'Писем пока нет.',
    refresh: 'Обновить',
  },
  signup: {
    metaTitle: 'Регистрация',
```

- [ ] **Step 8: Проверить, что тест проходит**

Run: `npm test -- src/auth`
Expected: PASS.

- [ ] **Step 9: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 10: Ручная проверка**

`npm run dev`, браузер на `http://localhost:5173`:
1. `/ru/signup` → регистрация → в кабинете плашка «Подтвердите email…». На `/ru/checkout` оплата Standard отвечает «Сначала подтвердите email…».
2. `/dev/mail` (и `/ru/dev/mail`) показывает письмо «Подтвердите email для LaslesVPN» со ссылкой `http://localhost:5173/ru/verify-email?token=…`. Переход по ней: «Email подтверждён», плашка в кабинете пропала, оплата проходит.
3. Повторный переход по той же ссылке: снова «Email подтверждён» (уже подтверждён). Ссылка с испорченным токеном: «Ссылка недействительна».
4. «Отправить ещё раз» в плашке → новое письмо в `/dev/mail`.
5. `/forgot-password` с несуществующим email: тот же ответ «Если аккаунт… существует…», письма нет. С существующим: письмо, ссылка `/reset-password?token=…&email=…` → новый пароль → `/login?reset=1&email=…` с подставленным email и «Пароль изменён». Повтор той же ссылки: «Ссылка недействительна или уже использована.»

- [ ] **Step 11: Commit**

```bash
git add src
git commit -m "Add forgot/reset password, email confirmation and dev mail pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 13: Двухэтапный вход (TOTP и резервные коды)

Плагин `twoFactor`: включение в Настройках (пароль → QR-код и ключ → первый код → 10 резервных кодов), шаг `/login/2fa` с кодом или резервным кодом, отключение по паролю.

**Files:**
- Create: `server/two-factor.test.ts`, `src/auth/totp.ts`, `src/auth/totp.test.ts`, `src/pages/dashboard/settings/TwoFactorCard.tsx`, `src/pages/LoginTwoFactor.tsx`
- Modify: `server/auth.ts`, `server/test/helpers.ts`, `src/pages/dashboard/Settings.tsx`, `src/App.tsx`, `src/pages/pages.css`, `src/i18n/en.ts`, `src/i18n/ru.ts`, `package.json`

**Interfaces:**
- Consumes: `createAuth` (Task 5), `createTestApp`, `mergeCookies` (Task 5), `authCall`, `authClient` с `twoFactorClient()` (Task 11), `signIn() → 'two-factor'` (Task 11 уже ведёт на `/login/2fa?next=…`).
- Produces (HTTP, Better Auth): `POST /api/auth/two-factor/enable { password }` → `{ totpURI, backupCodes }`; `verify-totp { code }`; `verify-backup-code { code }`; `disable { password }`; вход с включённой 2FA отвечает `{ twoFactorRedirect: true }` без cookie сессии.
- Produces: `totp(otpauthUri, at?)` в тестовых помощниках; `totpSecret(totpURI): string` (ключ группами по 4); `<TwoFactorCard />`; страница `LoginTwoFactor`.
- Пользователь получает поле `twoFactorEnabled` (колонка уже есть с Task 3).

- [ ] **Step 1: Установить зависимости**

```bash
npm install qrcode@1.5.4
npm install -D @types/qrcode@1.5.6
```

- [ ] **Step 2: Написать падающие тесты**

В `server/test/helpers.ts` первой строкой импортов добавить `import { createHmac } from 'node:crypto'`, а в конец файла:

```ts
// RFC 6238 TOTP (SHA-1, 6 digits, 30 s), enough to act as an authenticator app.
export function totp(otpauthUri: string, at = Date.now()) {
  const secret = new URL(otpauthUri).searchParams.get('secret') ?? ''
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const ch of secret.replace(/=+$/, '').toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0')
  const key = Buffer.from(bits.match(/.{8}/g)?.map((b) => parseInt(b, 2)) ?? [])
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)))
  const hmac = createHmac('sha1', key).update(counter).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return String(code).padStart(6, '0')
}
```

Create `server/two-factor.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, json, mergeCookies, PASSWORD, totp, type TestApp } from './test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

// Turns 2FA on the way the Settings page does: password → QR → first code.
async function enable(email: string) {
  const cookie = await t.verifiedUser(email)
  const res = await t.call('/api/auth/two-factor/enable', { method: 'POST', cookie, body: { password: PASSWORD } })
  expect(res.status).toBe(200)
  const { totpURI, backupCodes } = await json<{ totpURI: string; backupCodes: string[] }>(res)
  const nextCookie = mergeCookies(cookie, res)
  const verify = await t.call('/api/auth/two-factor/verify-totp', {
    method: 'POST',
    cookie: nextCookie,
    body: { code: totp(totpURI) },
  })
  expect(verify.status).toBe(200)
  return { totpURI, backupCodes, cookie: mergeCookies(nextCookie, verify) }
}

describe('two-factor sign-in', () => {
  it('enabling needs the password and gives 10 backup codes and an otpauth URI', async () => {
    const cookie = await t.verifiedUser('pw2fa@example.com')
    const wrong = await t.call('/api/auth/two-factor/enable', { method: 'POST', cookie, body: { password: 'nope-nope' } })
    expect(await json(wrong)).toEqual({ error: { code: 'invalid_credentials' } })

    const { totpURI, backupCodes, cookie: after } = await enable('on2fa@example.com')
    expect(totpURI).toMatch(/^otpauth:\/\/totp\/LaslesVPN:on2fa%40example\.com\?/)
    expect(backupCodes).toHaveLength(10)
    const me = await json<{ user: { twoFactorEnabled: boolean } }>(await t.call('/api/me', { cookie: after }))
    expect(me.user.twoFactorEnabled).toBe(true)
  })

  it('a password alone gives no session, only the second step', async () => {
    await enable('step@example.com')
    const { res, cookie } = await t.signIn('step@example.com')
    expect(res.status).toBe(200)
    expect(await json(res)).toMatchObject({ twoFactorRedirect: true })
    expect(cookie).not.toContain('session_token')
    expect((await t.call('/api/me', { cookie })).status).toBe(401)
  })

  it('signs in with an authenticator code', async () => {
    const { totpURI } = await enable('code@example.com')
    const { cookie } = await t.signIn('code@example.com')
    const wrong = await t.call('/api/auth/two-factor/verify-totp', { method: 'POST', cookie, body: { code: '000000' } })
    expect(await json(wrong)).toEqual({ error: { code: 'invalid_credentials' } })

    const res = await t.call('/api/auth/two-factor/verify-totp', { method: 'POST', cookie, body: { code: totp(totpURI) } })
    expect(res.status).toBe(200)
    expect((await t.call('/api/me', { cookie: mergeCookies(cookie, res) })).status).toBe(200)
  })

  it('signs in with a backup code, and each backup code works once', async () => {
    const { backupCodes } = await enable('backup@example.com')
    const first = await t.signIn('backup@example.com')
    const res = await t.call('/api/auth/two-factor/verify-backup-code', {
      method: 'POST',
      cookie: first.cookie,
      body: { code: backupCodes[0] },
    })
    expect(res.status).toBe(200)
    expect((await t.call('/api/me', { cookie: mergeCookies(first.cookie, res) })).status).toBe(200)

    const second = await t.signIn('backup@example.com')
    const reuse = await t.call('/api/auth/two-factor/verify-backup-code', {
      method: 'POST',
      cookie: second.cookie,
      body: { code: backupCodes[0] },
    })
    expect(await json(reuse)).toEqual({ error: { code: 'invalid_credentials' } })
  })

  it('turning it off needs the password', async () => {
    const { cookie } = await enable('off@example.com')
    const wrong = await t.call('/api/auth/two-factor/disable', { method: 'POST', cookie, body: { password: 'nope-nope' } })
    expect(await json(wrong)).toEqual({ error: { code: 'invalid_credentials' } })
    const res = await t.call('/api/auth/two-factor/disable', { method: 'POST', cookie, body: { password: PASSWORD } })
    expect(res.status).toBe(200)
    const { res: plain } = await t.signIn('off@example.com')
    expect(await json(plain)).not.toHaveProperty('twoFactorRedirect')
  })
})
```

Create `src/auth/totp.test.ts`:

```ts
import { expect, it } from 'vitest'
import { totpSecret } from './totp'

it('reads and groups the secret of an otpauth URI', () => {
  expect(totpSecret('otpauth://totp/LaslesVPN:a%40b.c?secret=JBSWY3DPEHPK3PXP&issuer=LaslesVPN&digits=6&period=30')).toBe(
    'JBSW Y3DP EHPK 3PXP',
  )
  expect(totpSecret('not a uri')).toBe('')
})
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `npm test -- server/two-factor.test.ts src/auth/totp.test.ts`
Expected: FAIL — `/api/auth/two-factor/enable` отвечает 404, модуля `./totp` нет.

- [ ] **Step 4: Включить плагин на сервере**

В `server/auth.ts`:

Найти:

```ts
import { admin } from 'better-auth/plugins'
```

Заменить на:

```ts
import { admin, twoFactor } from 'better-auth/plugins'
```

Найти:

```ts
    plugins: [
      admin({
```

Заменить на:

```ts
    plugins: [
      twoFactor({ issuer: 'LaslesVPN' }),
      admin({
```

Резервных кодов по умолчанию 10, TOTP — 6 цифр на 30 секунд. Плагин сам ограничивает `/two-factor/*` до 3 запросов за 10 секунд, когда rate limit включён.

- [ ] **Step 5: Настройки**

Create `src/auth/totp.ts`:

```ts
// The manual-entry key shown next to the QR code: the base32 `secret` of an
// otpauth:// URI, in groups of four for easier typing.
export function totpSecret(totpURI: string): string {
  try {
    const secret = new URL(totpURI).searchParams.get('secret') ?? ''
    return secret.replace(/(.{4})(?=.)/g, '$1 ')
  } catch {
    return ''
  }
}
```

Create `src/pages/dashboard/settings/TwoFactorCard.tsx` (кодировщик QR грузится только на шаге с QR-кодом):

```tsx
import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../../api/errorMessage'
import { authCall } from '../../../auth/authCall'
import { authClient } from '../../../auth/client'
import { totpSecret } from '../../../auth/totp'
import { useAuth } from '../../../auth/useAuth'
import { message, useT, type Message } from '../../../i18n/useT'

// Turning on: password → QR code and key → first code → 10 backup codes.
type Step =
  | { name: 'idle' }
  | { name: 'password'; action: 'enable' | 'disable' }
  | { name: 'scan'; totpURI: string; qr: string; backupCodes: string[] }
  | { name: 'codes'; backupCodes: string[] }

export function TwoFactorCard() {
  const t = useT()
  const { user } = useAuth()
  const [step, setStep] = useState<Step>({ name: 'idle' })
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    } finally {
      setBusy(false)
    }
  }

  function handlePassword(e: FormEvent<HTMLFormElement>, action: 'enable' | 'disable') {
    e.preventDefault()
    const password = String(new FormData(e.currentTarget).get('password'))
    void run(async () => {
      if (action === 'disable') {
        await authCall(() => authClient.twoFactor.disable({ password }))
        setStep({ name: 'idle' })
        return
      }
      const setup = await authCall(() => authClient.twoFactor.enable({ password }))
      if (setup.method !== 'totp') throw new Error('Expected TOTP setup data')
      const { totpURI, backupCodes } = setup
      // Loaded on demand: only this step needs the QR encoder.
      const { toDataURL } = await import('qrcode')
      setStep({ name: 'scan', totpURI, qr: await toDataURL(totpURI, { margin: 1, width: 192 }), backupCodes })
    })
  }

  function handleCode(e: FormEvent<HTMLFormElement>, backupCodes: string[]) {
    e.preventDefault()
    const code = String(new FormData(e.currentTarget).get('code')).replace(/\s/g, '')
    void run(async () => {
      // The first valid code switches 2FA on for the account.
      await authCall(() => authClient.twoFactor.verifyTotp({ code }))
      setStep({ name: 'codes', backupCodes })
    })
  }

  const tf = t.settings.twoFactor

  return (
    <div className="card account-card">
      <h2 className="card-title">{tf.title}</h2>

      {step.name === 'idle' && (
        <>
          <p>{user.twoFactorEnabled ? tf.onText : tf.offText}</p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setStep({ name: 'password', action: user.twoFactorEnabled ? 'disable' : 'enable' })}
          >
            {user.twoFactorEnabled ? tf.disable : tf.enable}
          </button>
        </>
      )}

      {step.name === 'password' && (
        <form className="form" onSubmit={(e) => handlePassword(e, step.action)}>
          <label className="field">
            <span>{tf.passwordPrompt}</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error && <p className="form-error">{error(t)}</p>}
          <div className="button-row">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {tf.continue}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setStep({ name: 'idle' })}>
              {tf.cancel}
            </button>
          </div>
        </form>
      )}

      {step.name === 'scan' && (
        <form className="form" onSubmit={(e) => handleCode(e, step.backupCodes)}>
          <p>{tf.scan}</p>
          <img src={step.qr} alt={tf.qrAlt} width={192} height={192} />
          <p>
            {tf.secret} <code>{totpSecret(step.totpURI)}</code>
          </p>
          <label className="field">
            <span>{tf.code}</span>
            <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required />
          </label>
          {error && <p className="form-error">{error(t)}</p>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {tf.confirm}
          </button>
        </form>
      )}

      {step.name === 'codes' && (
        <>
          <p>
            <b>{tf.backupTitle}</b>
          </p>
          <p>{tf.backupText}</p>
          <ul className="backup-codes">
            {step.backupCodes.map((code) => (
              <li key={code}>
                <code>{code}</code>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setStep({ name: 'idle' })}>
            {tf.done}
          </button>
        </>
      )}
    </div>
  )
}
```

Replace `src/pages/dashboard/Settings.tsx`:

```tsx
import { usePageMeta } from '../../i18n/usePageMeta'
import { useT } from '../../i18n/useT'
import { DeleteAccountCard } from './settings/DeleteAccountCard'
import { PreferencesCard } from './settings/PreferencesCard'
import { ProfileCard } from './settings/ProfileCard'
import { TwoFactorCard } from './settings/TwoFactorCard'

export function Settings() {
  const t = useT()
  usePageMeta(t.settings.metaTitle)

  return (
    <div className="account-section account-grid">
      <ProfileCard />
      <TwoFactorCard />
      <PreferencesCard />
      <DeleteAccountCard />
    </div>
  )
}
```

В `src/pages/pages.css`:

Найти:

```css
/* ---------- Responsive ---------- */
```

Заменить на:

```css
.backup-codes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

/* ---------- Responsive ---------- */
```

- [ ] **Step 6: Шаг входа `/login/2fa`**

Create `src/pages/LoginTwoFactor.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../api/errorMessage'
import { authCall } from '../auth/authCall'
import { authClient } from '../auth/client'
import { safeNext } from '../auth/next'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { usePageMeta } from '../i18n/usePageMeta'
import { message, useT, type Message } from '../i18n/useT'

// Second sign-in step. The password step left a short-lived two_factor cookie;
// a valid code (or backup code) turns it into a normal session.
export function LoginTwoFactor() {
  const t = useT()
  usePageMeta(t.twoFactorLogin.metaTitle)
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [useBackup, setUseBackup] = useState(false)
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const code = String(new FormData(e.currentTarget).get('code')).trim()
    setBusy(true)
    try {
      if (useBackup) await authCall(() => authClient.twoFactor.verifyBackupCode({ code }))
      else await authCall(() => authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, '') }))
      navigate(next, { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.twoFactorLogin.title}</h1>
        <p className="auth-subtitle">{useBackup ? t.twoFactorLogin.backupSubtitle : t.twoFactorLogin.subtitle}</p>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{useBackup ? t.twoFactorLogin.backupCode : t.twoFactorLogin.code}</span>
            <input
              key={useBackup ? 'backup' : 'totp'}
              name="code"
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode={useBackup ? 'text' : 'numeric'}
              onChange={() => setError(null)}
            />
          </label>
          {error && <p className="form-error">{error(t)}</p>}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setUseBackup((v) => !v)
              setError(null)
            }}
          >
            {useBackup ? t.twoFactorLogin.useApp : t.twoFactorLogin.useBackup}
          </button>
          <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
            {t.twoFactorLogin.submit}
          </button>
        </form>

        <p className="auth-switch">
          <LocalLink to={`/login?next=${encodeURIComponent(next)}`}>{t.twoFactorLogin.backToLogin}</LocalLink>
        </p>
      </div>
    </section>
  )
}
```

В `src/App.tsx`:

Найти:

```tsx
import { Login } from './pages/Login'
```

Заменить на:

```tsx
import { Login } from './pages/Login'
import { LoginTwoFactor } from './pages/LoginTwoFactor'
```

Найти:

```tsx
      <Route path="login" element={<Login />} />
```

Заменить на:

```tsx
      <Route path="login" element={<Login />} />
      <Route path="login/2fa" element={<LoginTwoFactor />} />
```

- [ ] **Step 7: Тексты**

В `src/i18n/en.ts`:

Найти:

```ts
  forgot: {
    metaTitle: 'Forgot Password',
```

Заменить на:

```ts
  twoFactorLogin: {
    metaTitle: 'Two-Step Sign-In',
    title: 'Enter your code',
    subtitle: 'Open your authenticator app and enter the 6-digit code for LaslesVPN.',
    backupSubtitle: 'Enter one of the backup codes you saved when you turned on two-step sign-in.',
    code: 'Code',
    backupCode: 'Backup code',
    submit: 'Verify',
    useBackup: 'Use a backup code',
    useApp: 'Use the authenticator app',
    backToLogin: 'Back to sign in',
  },
  forgot: {
    metaTitle: 'Forgot Password',
```

В `src/i18n/ru.ts`:

Найти:

```ts
  forgot: {
    metaTitle: 'Восстановление пароля',
```

Заменить на:

```ts
  twoFactorLogin: {
    metaTitle: 'Двухэтапный вход',
    title: 'Введите код',
    subtitle: 'Откройте приложение-аутентификатор и введите 6-значный код для LaslesVPN.',
    backupSubtitle: 'Введите один из резервных кодов, которые вы сохранили при включении двухэтапного входа.',
    code: 'Код',
    backupCode: 'Резервный код',
    submit: 'Подтвердить',
    useBackup: 'Использовать резервный код',
    useApp: 'Использовать приложение-аутентификатор',
    backToLogin: 'Вернуться ко входу',
  },
  forgot: {
    metaTitle: 'Восстановление пароля',
```

В `src/i18n/en.ts`:

Найти:

```ts
    preferences: 'App preferences',
```

Заменить на:

```ts
    twoFactor: {
      title: 'Two-step sign-in',
      offText:
        'Add a second step to signing in: a 6-digit code from an authenticator app such as Google Authenticator or 1Password.',
      onText: 'On. Every sign-in asks for a code from your authenticator app.',
      enable: 'Turn On',
      disable: 'Turn Off',
      passwordPrompt: 'Enter your password to continue',
      continue: 'Continue',
      cancel: 'Cancel',
      scan: 'Scan this QR code with your authenticator app, or enter the key by hand. Then type the code the app shows.',
      qrAlt: 'QR code for the authenticator app',
      secret: 'Key:',
      code: 'Code from the app',
      confirm: 'Confirm',
      backupTitle: 'Two-step sign-in is on. Save your backup codes.',
      backupText:
        "Each code works once if you lose access to the app. Keep them somewhere safe: we won't show them again.",
      done: 'Done',
    },
    preferences: 'App preferences',
```

В `src/i18n/ru.ts`:

Найти:

```ts
    preferences: 'Настройки приложения',
```

Заменить на:

```ts
    twoFactor: {
      title: 'Двухэтапный вход',
      offText:
        'Добавьте второй шаг при входе: 6-значный код из приложения-аутентификатора, например Google Authenticator или 1Password.',
      onText: 'Включён. При каждом входе нужен код из приложения-аутентификатора.',
      enable: 'Включить',
      disable: 'Выключить',
      passwordPrompt: 'Введите пароль, чтобы продолжить',
      continue: 'Продолжить',
      cancel: 'Отмена',
      scan: 'Отсканируйте QR-код в приложении-аутентификаторе или введите ключ вручную. Затем введите код, который покажет приложение.',
      qrAlt: 'QR-код для приложения-аутентификатора',
      secret: 'Ключ:',
      code: 'Код из приложения',
      confirm: 'Подтвердить',
      backupTitle: 'Двухэтапный вход включён. Сохраните резервные коды.',
      backupText:
        'Каждый код можно использовать один раз, если вы потеряете доступ к приложению. Храните их в надёжном месте: повторно мы их не покажем.',
      done: 'Готово',
    },
    preferences: 'Настройки приложения',
```

- [ ] **Step 8: Проверить, что тесты проходят**

Run: `npm test -- server/two-factor.test.ts src/auth/totp.test.ts`
Expected: PASS.

- [ ] **Step 9: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 10: Ручная проверка**

Вход `demo@laslesvpn.test` → Настройки → «Двухэтапный вход» → «Включить» → пароль → QR-код (сканируется Google Authenticator или 1Password) и ключ → код из приложения → 10 резервных кодов → «Готово», карточка пишет «Включён». Выход, вход: после пароля открывается `/login/2fa`, код из приложения пускает в кабинет. Ещё раз: «Использовать резервный код» — первый код пускает, повторно тот же код не подходит. «Выключить» требует пароль. Всё то же на `/ru`.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json server src
git commit -m "Add two-step sign-in with TOTP and backup codes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 14: Вход через Google

Кнопка «Продолжить с Google» на входе и регистрации, только если заданы `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` (сайт узнаёт об этом из `/api/config`). Совпадающий подтверждённый аккаунт привязывается к Google (Google — доверенный провайдер).

**Files:**
- Create: `server/google.test.ts`, `src/auth/ui/GoogleButton.tsx`
- Modify: `server/auth.ts`, `src/pages/Login.tsx` и `src/pages/Signup.tsx` (целиком), `src/pages/pages.css`, `src/i18n/en.ts`, `src/i18n/ru.ts`

**Interfaces:**
- Consumes: `config.google` (Task 2), `/api/config` (Task 2), `useConfig` (Task 9), `authCall`, `authClient` (Task 11), `localize` из `src/i18n/locales.ts`.
- Produces (HTTP, Better Auth): `POST /api/auth/sign-in/social { provider: 'google', callbackURL, errorCallbackURL }` → `{ url, redirect: true }`; колбэк Google — `GET /api/auth/callback/google` (через прокси Vite). Чужой `callbackURL` → 403 `forbidden`. Без ключей провайдера нет: 404.
- Produces: `<GoogleButton next={string} />` — рисует кнопку и разделитель «или», либо ничего.
- Словарь: `t.auth.google`, `t.auth.or`.

- [ ] **Step 1: Написать падающий тест**

Create `server/google.test.ts`:

```ts
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createTestApp, json, type TestApp } from './test/helpers.ts'

let off: TestApp
let on: TestApp
beforeAll(async () => {
  off = await createTestApp()
  on = await createTestApp({ env: { GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'secret' } })
})
afterAll(async () => {
  await off.close()
  await on.close()
})

it('is reported and offered only when both keys are set', async () => {
  expect(await json(await off.call('/api/config'))).toEqual({ googleEnabled: false, devMail: true })
  const res = await off.call('/api/auth/sign-in/social', { method: 'POST', body: { provider: 'google', callbackURL: '/' } })
  expect(res.status).toBe(404)

  expect(await json(await on.call('/api/config'))).toEqual({ googleEnabled: true, devMail: true })
})

it('sends the browser to Google with our callback, keeping the page language for the way back', async () => {
  const res = await on.call('/api/auth/sign-in/social', {
    method: 'POST',
    body: { provider: 'google', callbackURL: '/ru/dashboard', errorCallbackURL: '/ru/login' },
  })
  expect(res.status).toBe(200)
  const { url } = await json<{ url: string }>(res)
  const google = new URL(url)
  expect(google.host).toBe('accounts.google.com')
  expect(google.searchParams.get('redirect_uri')).toBe('http://localhost:5173/api/auth/callback/google')
})

it('refuses to send the user back to another site afterwards', async () => {
  const res = await on.call('/api/auth/sign-in/social', {
    method: 'POST',
    body: { provider: 'google', callbackURL: 'https://evil.example/steal' },
  })
  expect(res.status).toBe(403)
  expect(await json(res)).toEqual({ error: { code: 'forbidden' } })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test -- server/google.test.ts`
Expected: FAIL — `sign-in/social` с ключами отвечает 404: провайдер не настроен.

- [ ] **Step 3: Провайдер и привязка аккаунтов**

В `server/auth.ts`:

Найти:

```ts
    session: { expiresIn: THIRTY_DAYS },
```

Заменить на:

```ts
    session: { expiresIn: THIRTY_DAYS },
    account: {
      accountLinking: { enabled: true, trustedProviders: ['google'] },
    },
    socialProviders: config.google
      ? { google: { clientId: config.google.clientId, clientSecret: config.google.clientSecret } }
      : {},
```

- [ ] **Step 4: Кнопка**

Create `src/auth/ui/GoogleButton.tsx`:

```tsx
import { useState } from 'react'
import { errorMessage } from '../../api/errorMessage'
import { useConfig } from '../../api/useApi'
import { localize } from '../../i18n/locales'
import { useLocale } from '../../i18n/useLocale'
import { message, useT, type Message } from '../../i18n/useT'
import { authCall } from '../authCall'
import { authClient } from '../client'

// Shown only when the server has Google keys (/api/config). Better Auth sends
// the browser to Google and back to `next` in the current language.
export function GoogleButton({ next }: { next: string }) {
  const t = useT()
  const locale = useLocale()
  const { data: config } = useConfig()
  const [error, setError] = useState<Message>(null)

  if (!config?.googleEnabled) return null

  async function handleClick() {
    setError(null)
    try {
      await authCall(() =>
        authClient.signIn.social({
          provider: 'google',
          callbackURL: localize(next, locale),
          errorCallbackURL: localize('/login', locale),
        }),
      )
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    }
  }

  return (
    <>
      <button type="button" className="btn btn-outline form-submit" onClick={handleClick}>
        {t.auth.google}
      </button>
      {error && <p className="form-error">{error(t)}</p>}
      <p className="auth-divider">{t.auth.or}</p>
    </>
  )
}
```

Replace `src/pages/Login.tsx` (итоговая версия, добавлена `<GoogleButton next={next} />`):

```tsx
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../api/errorMessage'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { safeNext } from '../auth/next'
import { GoogleButton } from '../auth/ui/GoogleButton'
import { useAuth } from '../auth/useAuth'
import { message, useT, type Message } from '../i18n/useT'
import { usePageMeta } from '../i18n/usePageMeta'

export function Login() {
  const t = useT()
  usePageMeta(t.login.metaTitle)
  const { signIn } = useAuth()
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  // After a password reset the email is passed along so it does not need retyping.
  const presetEmail = params.get('email') ?? ''
  const afterReset = params.get('reset') === '1'
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    setBusy(true)
    try {
      const result = await signIn(email, password)
      if (result === 'two-factor') navigate(`/login/2fa?next=${encodeURIComponent(next)}`, { replace: true })
      else navigate(next, { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.login.title}</h1>
        <p className="auth-subtitle">{t.login.subtitle}</p>
        {afterReset && (
          <p className="form-note" role="status">
            {t.login.passwordChanged}
          </p>
        )}

        <GoogleButton next={next} />

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{t.auth.email}</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={t.auth.emailPlaceholder}
              defaultValue={presetEmail}
            />
          </label>
          <label className="field">
            <span>{t.auth.password}</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={() => setError(null)}
            />
          </label>
          {error && <p className="form-error">{error(t)}</p>}
          <LocalLink to="/forgot-password" className="link-button">
            {t.login.forgot}
          </LocalLink>
          <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
            {t.login.submit}
          </button>
        </form>

        <p className="auth-switch">
          {t.login.newHere}{' '}
          <LocalLink to={`/signup?next=${encodeURIComponent(next)}`}>{t.login.createAccount}</LocalLink>
        </p>
      </div>
    </section>
  )
}
```

Replace `src/pages/Signup.tsx` (итоговая версия):

```tsx
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../api/errorMessage'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { safeNext } from '../auth/next'
import { GoogleButton } from '../auth/ui/GoogleButton'
import { useAuth } from '../auth/useAuth'
import { useLocale } from '../i18n/useLocale'
import { message, useT, type Message } from '../i18n/useT'
import { usePageMeta } from '../i18n/usePageMeta'

export function Signup() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.signup.metaTitle)
  const { signUp } = useAuth()
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'), '/checkout')
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name')).trim()
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    if (password.length < 8) {
      setError(message((t) => t.auth.passwordTooShort))
      return
    }
    setBusy(true)
    try {
      // The confirmation email goes out in the language of this page.
      await signUp({ name, email, password, locale })
      navigate(next, { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.signup.title}</h1>
        <p className="auth-subtitle">{t.signup.subtitle}</p>

        <GoogleButton next={next} />

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{t.signup.fullName}</span>
            <input name="name" required autoComplete="name" placeholder={t.signup.namePlaceholder} />
          </label>
          <label className="field">
            <span>{t.auth.email}</span>
            <input name="email" type="email" required autoComplete="email" placeholder={t.auth.emailPlaceholder} />
          </label>
          <label className="field">
            <span>{t.auth.password}</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder={t.signup.passwordPlaceholder}
              onChange={() => setError(null)}
            />
          </label>
          {error && <p className="form-error">{error(t)}</p>}
          <label className="checkbox">
            <input type="checkbox" required />
            <span>
              {t.signup.agreeBefore}
              <LocalLink to="/terms">{t.signup.terms}</LocalLink>
              {t.signup.agreeMiddle}
              <LocalLink to="/privacy">{t.signup.privacy}</LocalLink>
            </span>
          </label>
          <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
            {t.signup.submit}
          </button>
        </form>

        <p className="auth-switch">
          {t.signup.haveAccount}
          <LocalLink to={`/login?next=${encodeURIComponent(next)}`}>{t.signup.signIn}</LocalLink>
        </p>
      </div>
    </section>
  )
}
```

В `src/pages/pages.css`:

Найти:

```css
/* ---------- Responsive ---------- */
```

Заменить на:

```css
.auth-divider {
  margin: 16px 0;
  color: var(--muted);
  font-size: 14px;
  text-align: center;
}

/* ---------- Responsive ---------- */
```

- [ ] **Step 5: Тексты**

В `src/i18n/en.ts`:

Найти:

```ts
    passwordTooShort: 'Password must be at least 8 characters.',
```

Заменить на:

```ts
    passwordTooShort: 'Password must be at least 8 characters.',
    google: 'Continue with Google',
    or: 'or',
```

В `src/i18n/ru.ts`:

Найти:

```ts
    passwordTooShort: 'Пароль должен содержать не менее 8 символов.',
```

Заменить на:

```ts
    passwordTooShort: 'Пароль должен содержать не менее 8 символов.',
    google: 'Продолжить с Google',
    or: 'или',
```

- [ ] **Step 6: Проверить, что тест проходит**

Run: `npm test -- server/google.test.ts`
Expected: PASS.

- [ ] **Step 7: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 8: Ручная проверка**

Без ключей: на `/login` и `/signup` кнопки Google нет. С ключами (OAuth-клиент Google, redirect URI `http://localhost:5173/api/auth/callback/google`, ключи в `.env`, перезапуск `npm run dev`): кнопка есть, вход возвращает на `next` в языке страницы (`/ru/dashboard` из `/ru/login`). Если ключей нет, этот пункт отмечается как непроверенный в отчёте задачи.

- [ ] **Step 9: Commit**

```bash
git add server src
git commit -m "Add Google sign-in when keys are configured" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 15: Настройки: смена email, смена пароля, активные сеансы

Смена email — письмо на новый адрес, адрес меняется только после перехода по ссылке. Смена пароля требует текущий и завершает другие сеансы. Список сеансов и «Выйти на всех устройствах».

**Files:**
- Create: `server/settings.test.ts`, `src/auth/sessions.ts`, `src/auth/sessions.test.ts`, `src/pages/dashboard/settings/EmailCard.tsx`, `src/pages/dashboard/settings/PasswordCard.tsx`, `src/pages/dashboard/settings/SessionsCard.tsx`
- Modify: `server/auth.ts`, `src/pages/dashboard/Settings.tsx` (целиком), `src/i18n/en.ts`, `src/i18n/ru.ts`

**Interfaces:**
- Consumes: `sendMail`, шаблон `changeEmail` (Task 4), `/verify-email` (Task 12), `authCall`, `authClient` (Task 11), `formatDate` (`src/auth/account.ts`).
- Produces (HTTP, Better Auth): `POST /api/auth/change-email { newEmail }` (занятый адрес отвечает так же, но ничего не делает); `POST /api/auth/change-password { currentPassword, newPassword, revokeOtherSessions: true }`; `GET /api/auth/list-sessions`; `POST /api/auth/revoke-sessions`.
- Produces: `describeAgent(userAgent): string | null` («Chrome · macOS»); `<EmailCard />`, `<PasswordCard />`, `<SessionsCard />`.
- Словарь: секции `t.settings.email`, `t.settings.sessions`; новые тексты `t.settings.newTooShort` (8 символов) и `t.settings.passwordUpdated`.

- [ ] **Step 1: Написать падающие тесты**

Create `server/settings.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, json, mergeCookies, PASSWORD, type TestApp } from './test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

describe('change email', () => {
  it('mails the new address and switches only after the link is opened', async () => {
    const cookie = await t.verifiedUser('first@example.com', { locale: 'ru' })
    const res = await t.call('/api/auth/change-email', { method: 'POST', cookie, body: { newEmail: 'second@example.com' } })
    expect(res.status).toBe(200)

    let me = await json<{ user: { email: string } }>(await t.call('/api/me', { cookie }))
    expect(me.user.email).toBe('first@example.com')

    const mail = await t.lastMail('second@example.com')
    expect(mail.subject).toBe('Подтвердите новый email для LaslesVPN')
    expect(t.linkIn(mail).pathname).toBe('/ru/verify-email')

    const verify = await t.call(`/api/auth/verify-email?token=${t.tokenIn(mail)}`, { cookie })
    expect(verify.status).toBe(200)
    me = await json(await t.call('/api/me', { cookie: mergeCookies(cookie, verify) }))
    expect(me.user.email).toBe('second@example.com')
    expect((await t.signIn('second@example.com')).res.status).toBe(200)
  })

  it('a taken address looks the same to the requester and changes nothing', async () => {
    await t.signUp('taken@example.com')
    const cookie = await t.verifiedUser('mine@example.com')
    const res = await t.call('/api/auth/change-email', { method: 'POST', cookie, body: { newEmail: 'taken@example.com' } })
    expect(res.status).toBe(200)
    expect(await t.mailCount('taken@example.com', 'Confirm your new email for LaslesVPN')).toBe(0)
  })
})

describe('change password', () => {
  it('needs the current password and signs other devices out', async () => {
    const laptop = await t.verifiedUser('pw@example.com')
    const { cookie: phone } = await t.signIn('pw@example.com')

    const wrong = await t.call('/api/auth/change-password', {
      method: 'POST',
      cookie: laptop,
      body: { currentPassword: 'nope-nope', newPassword: 'fresh-pass-1', revokeOtherSessions: true },
    })
    expect(await json(wrong)).toEqual({ error: { code: 'invalid_credentials' } })

    const res = await t.call('/api/auth/change-password', {
      method: 'POST',
      cookie: laptop,
      body: { currentPassword: PASSWORD, newPassword: 'fresh-pass-1', revokeOtherSessions: true },
    })
    expect(res.status).toBe(200)
    expect((await t.call('/api/me', { cookie: mergeCookies(laptop, res) })).status).toBe(200)
    expect((await t.call('/api/me', { cookie: phone })).status).toBe(401)
  })
})

describe('sessions', () => {
  it('lists active sessions and signs out everywhere', async () => {
    const a = await t.verifiedUser('multi@example.com')
    const { cookie: b } = await t.signIn('multi@example.com')
    const list = await json<{ id: string }[]>(await t.call('/api/auth/list-sessions', { cookie: a }))
    expect(list.length).toBeGreaterThanOrEqual(2)

    const res = await t.call('/api/auth/revoke-sessions', { method: 'POST', cookie: a, body: {} })
    expect(res.status).toBe(200)
    expect((await t.call('/api/me', { cookie: a })).status).toBe(401)
    expect((await t.call('/api/me', { cookie: b })).status).toBe(401)
  })
})
```

Create `src/auth/sessions.test.ts`:

```ts
import { expect, it } from 'vitest'
import { describeAgent } from './sessions'

it.each([
  [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    'Chrome · macOS',
  ],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1', 'Safari · iOS'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36 Edg/140.0', 'Edge · Windows'],
  ['Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0', 'Firefox · Linux'],
  ['curl/8.0', null],
  [null, null],
])('%s → %s', (ua, label) => {
  expect(describeAgent(ua)).toBe(label)
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test -- server/settings.test.ts src/auth/sessions.test.ts`
Expected: FAIL — `change-email` отвечает 400 `validation_failed` (смена email выключена), модуля `./sessions` нет. Тесты пароля и сеансов уже зелёные: это встроенные эндпоинты Better Auth, тесты фиксируют их поведение.

- [ ] **Step 3: Смена email на сервере**

В `server/auth.ts` письмо о новом адресе отличается от письма о регистрации:

Найти:

```ts
      sendVerificationEmail: async ({ user, token }) => {
        await sendMail('verifyEmail', user, '/verify-email', { token })
      },
```

Заменить на:

```ts
      // Also used for a changed address: Better Auth passes the new email as user.email.
      sendVerificationEmail: async ({ user, token }) => {
        const kind = isEmailChangeToken(token) ? 'changeEmail' : 'verifyEmail'
        await sendMail(kind, user, '/verify-email', { token })
      },
```

Найти:

```ts
      deleteUser: { enabled: true },
```

Заменить на:

```ts
      changeEmail: { enabled: true },
      deleteUser: { enabled: true },
```

И в конец файла:

```ts
// Email-change tokens are JWTs whose payload carries `updateTo`.
function isEmailChangeToken(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as {
      updateTo?: unknown
    }
    return typeof payload.updateTo === 'string'
  } catch {
    return false
  }
}
```

Без `sendChangeEmailConfirmation` Better Auth сразу пишет на новый адрес и меняет email только по ссылке из этого письма, как требует spec.

- [ ] **Step 4: Карточки настроек**

Create `src/auth/sessions.ts`:

```ts
// A readable label for a session's user agent: "Chrome · macOS".
// Browser and OS names are product names and stay in English.
const browsers: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]

const systems: [RegExp, string][] = [
  [/iPhone|iPad/, 'iOS'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
]

export function describeAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null
  const browser = browsers.find(([re]) => re.test(userAgent))?.[1]
  const system = systems.find(([re]) => re.test(userAgent))?.[1]
  const parts = [browser, system].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}
```

Create `src/pages/dashboard/settings/EmailCard.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../../api/errorMessage'
import { authCall } from '../../../auth/authCall'
import { authClient } from '../../../auth/client'
import { useAuth } from '../../../auth/useAuth'
import { message, useT, type Message } from '../../../i18n/useT'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The address changes only after the link sent to the new address is opened
// (/verify-email); until then the account keeps the old one.
export function EmailCard() {
  const t = useT()
  const { user } = useAuth()
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const newEmail = String(new FormData(form).get('email')).trim().toLowerCase()
    if (!EMAIL.test(newEmail)) return setError(message((t) => t.settings.invalidEmail))
    if (newEmail === user?.email) return setError(message((t) => t.settings.email.same))
    setBusy(true)
    try {
      await authCall(() => authClient.changeEmail({ newEmail }))
      setSentTo(newEmail)
      form.reset()
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card account-card">
      <h2 className="card-title">{t.settings.email.title}</h2>
      <p>
        {t.settings.email.currentBefore}
        <b>{user.email}</b>
      </p>
      <form
        className="form"
        noValidate
        onSubmit={handleSubmit}
        onChange={() => {
          setError(null)
          setSentTo('')
        }}
      >
        <label className="field">
          <span>{t.settings.email.newEmail}</span>
          <input name="email" type="email" autoComplete="email" placeholder={t.auth.emailPlaceholder} required />
        </label>
        {error && <p className="form-error">{error(t)}</p>}
        {sentTo && (
          <p className="form-note" role="status">
            {t.settings.email.sentBefore}
            <b>{sentTo}</b>
            {t.settings.email.sentAfter}
          </p>
        )}
        <button type="submit" className="btn btn-outline" disabled={busy}>
          {t.settings.email.submit}
        </button>
      </form>
    </div>
  )
}
```

Create `src/pages/dashboard/settings/PasswordCard.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../../api/errorMessage'
import { authCall } from '../../../auth/authCall'
import { authClient } from '../../../auth/client'
import { message, useT, type Message } from '../../../i18n/useT'

export function PasswordCard() {
  const t = useT()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const currentPassword = String(data.get('current'))
    const newPassword = String(data.get('next'))
    if (!currentPassword) return setError(message((t) => t.settings.enterCurrent))
    if (newPassword.length < 8) return setError(message((t) => t.settings.newTooShort))
    if (newPassword !== String(data.get('confirm'))) return setError(message((t) => t.settings.mismatch))
    setBusy(true)
    try {
      // Other devices are signed out; this one gets a fresh session.
      await authCall(() => authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true }))
      form.reset()
      setSaved(true)
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card account-card">
      <h2 className="card-title">{t.settings.password}</h2>
      <form
        className="form"
        onSubmit={handleSubmit}
        onChange={() => {
          setSaved(false)
          setError(null)
        }}
      >
        <label className="field">
          <span>{t.settings.currentPassword}</span>
          <input name="current" type="password" autoComplete="current-password" />
        </label>
        <div className="field-row">
          <label className="field">
            <span>{t.settings.newPassword}</span>
            <input name="next" type="password" autoComplete="new-password" />
          </label>
          <label className="field">
            <span>{t.settings.confirm}</span>
            <input name="confirm" type="password" autoComplete="new-password" />
          </label>
        </div>
        {error && <p className="form-error">{error(t)}</p>}
        {saved && (
          <p className="form-note" role="status">
            {t.settings.passwordUpdated}
          </p>
        )}
        <button type="submit" className="btn btn-outline" disabled={busy}>
          {t.settings.updatePassword}
        </button>
      </form>
    </div>
  )
}
```

Create `src/pages/dashboard/settings/SessionsCard.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { errorMessage } from '../../../api/errorMessage'
import { authCall } from '../../../auth/authCall'
import { authClient } from '../../../auth/client'
import { formatDate } from '../../../auth/account'
import { describeAgent } from '../../../auth/sessions'
import { useLocalNavigate } from '../../../i18n/useLocalNavigate'
import { useLocale } from '../../../i18n/useLocale'
import { message, useT, type Message } from '../../../i18n/useT'

interface SessionRow {
  id: string
  userAgent?: string | null
  createdAt: Date
}

export function SessionsCard() {
  const t = useT()
  const locale = useLocale()
  const navigate = useLocalNavigate()
  const current = authClient.useSession().data?.session.id
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [error, setError] = useState<Message>(null)

  useEffect(() => {
    let alive = true
    authCall(() => authClient.listSessions()).then(
      (list) => {
        if (alive) setSessions(list)
      },
      (err: unknown) => {
        if (alive) setError(message((t) => errorMessage(t, err)))
      },
    )
    return () => {
      alive = false
    }
  }, [])

  async function signOutEverywhere() {
    setError(null)
    try {
      await authCall(() => authClient.revokeSessions())
      navigate('/login', { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    }
  }

  return (
    <div className="card account-card">
      <h2 className="card-title">{t.settings.sessions.title}</h2>
      <p className="device-meta">{t.settings.sessions.text}</p>
      {sessions && (
        <ul className="stat-list">
          {sessions.map((s) => (
            <li key={s.id}>
              <span>
                {describeAgent(s.userAgent) ?? t.settings.sessions.unknownDevice}
                {s.id === current && (
                  <>
                    {' '}
                    <span className="badge badge-green">{t.common.thisDevice}</span>
                  </>
                )}
              </span>
              <span className="device-meta">{t.settings.sessions.signedIn(formatDate(s.createdAt, locale))}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="form-error">{error(t)}</p>}
      <button type="button" className="btn btn-outline" onClick={signOutEverywhere}>
        {t.settings.sessions.signOutEverywhere}
      </button>
    </div>
  )
}
```

Replace `src/pages/dashboard/Settings.tsx` (итоговая версия):

```tsx
import { usePageMeta } from '../../i18n/usePageMeta'
import { useT } from '../../i18n/useT'
import { DeleteAccountCard } from './settings/DeleteAccountCard'
import { EmailCard } from './settings/EmailCard'
import { PasswordCard } from './settings/PasswordCard'
import { PreferencesCard } from './settings/PreferencesCard'
import { ProfileCard } from './settings/ProfileCard'
import { SessionsCard } from './settings/SessionsCard'
import { TwoFactorCard } from './settings/TwoFactorCard'

export function Settings() {
  const t = useT()
  usePageMeta(t.settings.metaTitle)

  return (
    <div className="account-section account-grid">
      <ProfileCard />
      <EmailCard />
      <PasswordCard />
      <TwoFactorCard />
      <SessionsCard />
      <PreferencesCard />
      <DeleteAccountCard />
    </div>
  )
}
```

- [ ] **Step 5: Тексты**

В `src/i18n/en.ts`:

Найти:

```ts
    newTooShort: 'The new password needs at least 6 characters.',
```

Заменить на:

```ts
    newTooShort: 'The new password needs at least 8 characters.',
```

В `src/i18n/ru.ts`:

Найти:

```ts
    newTooShort: 'Новый пароль должен содержать не менее 6 символов.',
```

Заменить на:

```ts
    newTooShort: 'Новый пароль должен содержать не менее 8 символов.',
```

В `src/i18n/en.ts`:

Найти:

```ts
    passwordUpdated: 'Password updated. Use it next time you sign in.',
```

Заменить на:

```ts
    passwordUpdated: 'Password updated. Other devices have been signed out.',
```

В `src/i18n/ru.ts`:

Найти:

```ts
    passwordUpdated: 'Пароль обновлён. Используйте его при следующем входе.',
```

Заменить на:

```ts
    passwordUpdated: 'Пароль обновлён. На других устройствах выполнен выход.',
```

В `src/i18n/en.ts`:

Найти:

```ts
    password: 'Password',
    currentPassword
```

Заменить на:

```ts
    email: {
      title: 'Email address',
      currentBefore: 'Your account email: ',
      newEmail: 'New email',
      submit: 'Change Email',
      same: 'This is already your email.',
      sentBefore: 'We sent a confirmation link to ',
      sentAfter: '. The address changes once you open it.',
    },
    sessions: {
      title: 'Active sessions',
      text: 'Browsers and devices where you are signed in.',
      unknownDevice: 'Unknown device',
      signedIn: (date: string) => `Signed in ${date}`,
      signOutEverywhere: 'Sign Out on All Devices',
    },
    password: 'Password',
    currentPassword
```

В `src/i18n/ru.ts`:

Найти:

```ts
    password: 'Пароль',
    currentPassword
```

Заменить на:

```ts
    email: {
      title: 'Адрес электронной почты',
      currentBefore: 'Email аккаунта: ',
      newEmail: 'Новый email',
      submit: 'Сменить email',
      same: 'Это и так ваш текущий email.',
      sentBefore: 'Мы отправили ссылку для подтверждения на ',
      sentAfter: '. Адрес изменится, когда вы её откроете.',
    },
    sessions: {
      title: 'Активные сеансы',
      text: 'Браузеры и устройства, на которых выполнен вход.',
      unknownDevice: 'Неизвестное устройство',
      signedIn: (date: string) => `Вход: ${date}`,
      signOutEverywhere: 'Выйти на всех устройствах',
    },
    password: 'Пароль',
    currentPassword
```

- [ ] **Step 6: Проверить, что тесты проходят**

Run: `npm test -- server/settings.test.ts src/auth/sessions.test.ts`
Expected: PASS.

- [ ] **Step 7: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 8: Ручная проверка**

На `/ru/dashboard/settings`: «Сменить email» → в `/dev/mail` письмо «Подтвердите новый email для LaslesVPN» на новый адрес, в шапке карточки всё ещё старый адрес; переход по ссылке → «Email подтверждён», в карточке новый адрес, вход по новому адресу работает. Смена пароля с неверным текущим → «Неверный email или пароль.»; с верным → «Пароль обновлён…», вход в другом браузере сброшен. «Активные сеансы» показывают оба браузера, текущий с бейджем «Это устройство»; «Выйти на всех устройствах» → `/login`, второй браузер тоже вышел.

- [ ] **Step 9: Commit**

```bash
git add server src
git commit -m "Add email change, password change and active sessions to Settings" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


### Task 16: README и финальная проверка

README описывает запуск сервера, переменные `.env`, демо-аккаунты и `/dev/mail`; затем полный прогон и сквозная ручная проверка всех сценариев spec на `/` и `/ru`.

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README**

Replace `README.md`:

````markdown
# LaslesVPN

Multi-page React site built from the "FREEBIES Landingpage LaslesVPN" Figma community design,
with its own API server: real accounts, email confirmation, two-step sign-in and a dashboard
backed by a database. Payments are simulated.

## Run locally

Requires Node.js 25 (the API server runs its TypeScript directly). No Docker needed.

```bash
npm install
cp .env.example .env   # optional: every value has a working default
npm run dev            # site http://localhost:5173 + API on :3001
```

`npm run dev` starts Vite and the API server together; Vite proxies `/api/*` to the API, so the
browser only ever talks to `http://localhost:5173`. Open the site exactly at `APP_URL`
(`localhost`, not `127.0.0.1`): the API accepts changing requests only from that origin, and
email links point there. If port 5173 is taken, set another `APP_URL` in `.env`.

The database is an embedded Postgres (PGlite) in `.data/pglite`. Migrations run and demo accounts
are created on every start; nothing is overwritten once they exist.

| Account | Password | |
|---|---|---|
| `admin@laslesvpn.test` | `admin-password` | role `admin` |
| `demo@laslesvpn.test` | `demo-password` | Standard plan, 2 devices, 3 payments |

Passwords come from `SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD`.

Emails are not sent in development: they appear at [/dev/mail](http://localhost:5173/dev/mail) and in
the API console. Set `SMTP_*` in `.env` to send real mail. The test card `4000 0000 0000 0002`
is always declined; any other valid-looking card number is accepted and never stored (only its
brand and last four digits are kept).

Google sign-in appears when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set; the OAuth
client's redirect URI is `http://localhost:5173/api/auth/callback/google`.

```bash
npm run build        # type-check (site + server) and build the site into build/
npm test             # vitest: site, shared code and server integration tests
npm run i18n:scan    # check for untranslated strings
npm run lint
npm run db:reset     # delete the local database; the next start recreates and seeds it
npm run db:generate  # after editing server/db/schema.ts: write a new migration
npm run api          # the API server alone
```

## What's inside

- `src/pages/` — every route: landing, sign-in/up, two-step sign-in, password reset, email
  confirmation, checkout, dashboard, download, tutorials, locations, countries, servers, FAQ, blog,
  about, help, affiliate, partners, privacy, terms, and `/dev/mail` in development.
- `src/components/` — landing sections, header/footer and shared UI.
- `src/i18n/` — English and Russian: dictionaries (`en.ts`, `ru.ts`), `/ru` routing helpers,
  the EN/RU switch, plural forms and date/price formatting. Long content lives in
  `src/data/*.en.ts` / `*.ru.ts`.
- `src/data/` — plans (with pictures), servers (50+ in 30+ countries), platforms, FAQ, blog posts,
  legal texts.
- `src/auth/` — the Better Auth client, `useAuth()`, route guard and sign-in helpers.
- `src/api/` — `apiFetch`, data hooks (`useMe`, `useDevices`, `usePayments`) and error display.
- `shared/` — plans, prices, card helpers and API response types used by both the site and the server.
- `server/` — the API: Hono app (`app.ts`), Better Auth (`auth.ts`), Drizzle schema, migrations and
  seed (`db/`), mail templates (`mail/`) and the `/api/me`, `/api/checkout`, `/api/dev/mail` routes.
- `src/assets/` — illustrations and icons exported from Figma.

## API

Sign-in, sign-up, sessions, password reset, email change and two-step sign-in are Better Auth's
endpoints under `/api/auth/*`. The site's own endpoints:

| Endpoint | |
|---|---|
| `GET /api/config` | `{ googleEnabled, devMail }` |
| `GET /api/me` · `PATCH /api/me` | profile, subscription, preferences · name, language |
| `GET/POST /api/me/devices` · `DELETE /api/me/devices/:id` | devices, limited by plan |
| `GET /api/me/payments` | payment history |
| `PATCH /api/me/preferences` | auto-connect, kill switch, newsletter |
| `POST /api/me/subscription/cancel` | cancel at the end of the paid period |
| `POST /api/checkout` | test payment; the server computes the amount |
| `GET /api/dev/mail` | captured mail (development only) |

Every error is `{ "error": { "code": "…" } }` with an HTTP status; the site shows the text in the
page language. The codes are listed in `shared/api.ts`.

## Demo behaviour

The site is available in English (default) and Russian (`/ru/…`), with an EN/RU language switch
in the header. Emails follow the language of the page the account was created on, and later the
language the signed-in user browses in.

Payments are simulated: no money is charged and no card is stored. Contact, affiliate, partner and
newsletter forms still show a success message without sending anything.

## Deploying

Not set up yet. The API reads its settings from the environment (`.env.example` lists them):
`NODE_ENV=production` needs `BETTER_AUTH_SECRET`, turns on secure cookies and turns off `/dev/mail`.
The site uses client-side routing, so whatever serves `build/` must fall back to `index.html` for
unknown paths and pass `/api/*` to the API server.
````

- [ ] **Step 2: Полная проверка**

Run: `npm run lint && npm test && npm run build && npm run i18n:scan`
Expected: всё зелёное; `i18n:scan` пишет `No untranslated strings found`. (Vite может предупредить, что чанк больше 500 kB: это предупреждение, а не ошибка.)

- [ ] **Step 3: Сквозная ручная проверка**

`npm run db:reset && npm run dev`, браузер на `http://localhost:5173`. Каждый пункт пройти на `/` и на `/ru`:

1. Регистрация → письмо в `/dev/mail` на языке страницы → вход сразу работает → плашка «Подтвердите email» → оформление заказа отвечает `email_not_verified` → ссылка из письма → «Email подтверждён» → заказ Standard проходит, в «Оплате» платёж `INV-…`, сумма $9.00, карта Visa •••• 4242.
2. Карта `4000 0000 0000 0002` → «Карта отклонена…», платежа нет.
3. Устройства: лимит тарифа, «Удалить», ошибка лимита.
4. Отмена подписки: тариф действует до даты, кнопка отмены пропадает.
5. Выход, вход с неверным паролем → общий текст ошибки; шесть быстрых попыток подряд → «Слишком много попыток…».
6. Сброс пароля (одноразовая ссылка, вход с подставленным email, старые сеансы сброшены).
7. Смена email, смена пароля, сеансы, «Выйти на всех устройствах».
8. 2FA: включение, вход с кодом и с резервным кодом, отключение.
9. Google (если заданы ключи).
10. Удаление аккаунта: нужны слово-подтверждение и пароль; после удаления вход с этим email не работает.
11. Переключатель EN/RU в кабинете меняет тексты ошибок и плашек без перезагрузки.
12. Старые ключи `laslesvpn.session` / `laslesvpn.accounts` удаляются при загрузке.

Если пункт не проходит, это баг задачи, которой он принадлежит; чинить там, а не в этой.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Document the server, database and sign-in setup" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


## Самопроверка плана

**Покрытие spec:**

| Требование spec | Задача |
|---|---|
| `npm run dev` одной командой, Vite + API на :3001, прокси `/api/*`, без Docker | 2 |
| Hono на Node 25 с type stripping, один `package.json` | 2 |
| PGlite в `.data/`, Drizzle, миграции при старте; `DATABASE_URL` | 3 (`DATABASE_URL` — «Отклонения», п. 1) |
| Таблицы spec, каскадное удаление | 3 (тест каскада), 5 (удаление аккаунта) |
| Сид admin и demo (Standard, 2 устройства, 3 платежа), пароли из `.env`, `npm run db:reset` | 6 |
| `.env` / `.env.example`: секрет, `APP_URL`, Google, SMTP | 2 |
| Интерфейс `Mailer`, `dev_mail` + консоль, `/dev/mail`, SMTP | 4, 12 |
| Регистрация, пароль от 8 символов на сервере, письмо на языке страницы, вход сразу | 5, 11 |
| Плашка «Подтвердите email» и «Отправить ещё раз»; `email_not_verified` в checkout | 8, 12 |
| `/verify-email`: успех, истекла, недействительна | 5 (сервер), 12 |
| Общая ошибка `invalid_credentials`, rate limit, `account_banned` | 5, 6 |
| Сброс: одинаковый ответ, одноразовый токен на 1 час, отзыв сеансов, вход с подставленным email | 5, 12 |
| Google с привязкой по доверенному провайдеру, кнопка только при ключах | 14 |
| 2FA: пароль → QR и ключ → код → 10 резервных кодов; `/login/2fa`; отключение по паролю | 13 |
| Cookie `httpOnly`, `SameSite=Lax`, `Secure` в продакшене, 30 дней; список сеансов, выход везде | 5, 15 |
| Смена email по ссылке на новый адрес, имя сразу, пароль с текущим | 15, 11 (имя) |
| Удаление: слово-подтверждение и пароль, все данные удаляются | 5, 11 |
| Роли: регистрация всегда `customer`, `requireRole` с тестом | 5, 6 |
| Удаление `laslesvpn.session` и `laslesvpn.accounts` | 11 |
| `user.locale` при регистрации и при смене языка; письма EN и RU | 4, 5, 7, 11 |
| Все эндпоинты таблицы API spec | 2, 4, 7, 8 |
| zod на всех своих эндпоинтах | 7, 8 (`readBody`) |
| Единый `{ error: { code } }`, ровно 15 кодов, неизвестный код → `server_error`, сеть → `network` и «Повторить», 401 → вход с `next` | 2, 5, 9 |
| Origin против `APP_URL`; `/api/me/*` только свои данные | 6, 7 |
| `src/auth` на `createAuthClient` с `twoFactor` и `admin`, async-методы, `loading`, `RequireAuth` ждёт сессию | 11 |
| `src/api`: `apiFetch`, `ApiError`, `useMe`, `useDevices`, `usePayments`, без библиотек | 9 |
| Новые страницы EN/RU с `usePageMeta` | 12, 13 |
| Checkout отправляет заказ на сервер, клиентская проверка остаётся | 10 |
| Серверные тесты (PGlite в памяти, чистая база на файл) по списку spec | 3–8, 13–15 |
| Тесты фронта: `apiFetch` (коды, сеть), существующие тесты, `i18n:scan` | 9, каждая задача |
| Сквозная ручная проверка на `/` и `/ru` через `/dev/mail` | 16 |

Пробелов не найдено. За пределами плана по spec: админ-интерфейс, обязательная 2FA для сотрудников, возвраты, экран успешной оплаты, серверы VPN из базы, сохранение форм, настоящий SMTP и деплой.

**Заглушки:** «TBD», «TODO», «добавить обработку ошибок» и ссылки вида «как в Task N» без кода отсутствуют. Каждый шаг с кодом содержит полный код или точную пару «Найти / Заменить на». Единственная команда, чей результат не записан в плане дословно, — `npm run db:generate -- --name init` (Task 3): drizzle-kit пишет SQL и снимок схемы сам, и эти файлы не редактируются руками.

**Согласованность типов и имён** (проверено сборкой при механическом применении плана к копии репозитория, задачи 1–16):
- `createApp(deps)`: `{ config }` (Task 2) → `{ config, db }` (Task 4) → `{ config, db, auth }` (Task 5), дальше не меняется. Тесты обращаются к приложению только через `createTestApp().call`, поэтому изменение `AppDeps` не трогает их.
- `createTestApp()`: поля Task 2 (`app`, `config`, `call`, `close`) сохраняются в Tasks 4 и 5; Task 13 только добавляет экспорт `totp`.
- `ApiError.code: ErrorCode | 'network'` используется одинаково в `apiFetch` (Task 9), `authCall` (Task 11), `verifyOutcome` (Task 12) и `errorMessage`.
- `useAuth()` в Task 10 ещё старый, но `useMe`/`useDevices`/`usePayments` читают только `user`, который есть в обеих версиях. Типы старого `context.ts` к Task 11 нигде не используются: Task 10 убирает их из `Billing`, `Devices`, `Checkout` и `Settings`.
- `toProfile` (Task 7) читает `twoFactorEnabled` через приведение типа, потому что поле появляется в типе пользователя только с плагином `twoFactor` (Task 13).
- Ключи словаря: удаляемые (`login.resetSent`, `billing.expires`, `billing.saveCard`, `billing.cancel`, `billing.updateCard`, `billing.addCard`, `billing.cardUpdated`, `devices.signedInNow`) удаляются в той же задаче, где пропадает их последнее использование.

**Review Focus:** все пять пунктов закреплены тестами в своих задачах: `devPorts` (2), Origin (6) и атрибуты cookie (5); `authGate` (11); одноразовость, срок и отзыв сеансов при сбросе (5); бан при живой сессии (6); язык писем (5, 7, 15).
