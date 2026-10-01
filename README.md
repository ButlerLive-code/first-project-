# LaslesVPN

Multi-page React site built from the "FREEBIES Landingpage LaslesVPN" Figma community design,
with its own API server: real accounts, email confirmation, two-step sign-in and a dashboard
backed by a database. Payments are simulated.

## Run locally

Requires Node.js 25 or newer (the API server runs its TypeScript directly through Node's type stripping). No Docker needed.

```bash
npm install
cp .env.example .env   # optional: every value has a working default
npm run dev            # site http://localhost:5173 + API on 127.0.0.1:3001
```

`npm run dev` starts Vite and the API server with one command and stops both together. The site
is served at `APP_URL` (default `http://localhost:5173`); Vite runs with `--strictPort`, so if that port
is taken it fails instead of moving to another one (set a different `APP_URL` in `.env`). Open the
site exactly at `APP_URL` (`localhost`, not `127.0.0.1`): the API accepts changing requests only
from that origin, and email links point there. The API listens only on `127.0.0.1` (default
`API_PORT=3001`); the browser reaches it through the Vite proxy (`/api/*`).

The database is an embedded Postgres (PGlite) in `.data/pglite`, which is not committed. Migrations
run on every start, and the seed then restores demo data that is missing (see Demo behaviour).
`npm run db:reset` wipes the database for a clean slate; it refuses any `DATA_DIR` outside the
project and refuses to run when `NODE_ENV=production`.

| Account | Password | |
|---|---|---|
| `admin@laslesvpn.test` | `SEED_ADMIN_PASSWORD` (`admin-password`) | role `admin` |
| `demo@laslesvpn.test` | `SEED_DEMO_PASSWORD` (`demo-password`) | Standard plan, 2 devices, 3 payments |

The defaults come from `.env.example` and are meant for development. In production, seeding is
skipped unless both passwords are set explicitly, and the example passwords are refused.

If `SMTP_*` is set (in any environment), real mail is sent. Otherwise mail is not sent: it is
stored in the database, printed in the API console and, in development, shown at
[/dev/mail](http://localhost:5173/dev/mail) (Russian: `/ru/dev/mail`).

Google sign-in appears only when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. In
Google Cloud, add this authorized redirect URI: `{APP_URL}/api/auth/callback/google`
(`http://localhost:5173/api/auth/callback/google` by default). Google links only to an existing
account whose email is already confirmed. If the account has two-step sign-in
turned on, Google sign-in still asks for the code on `/login/2fa`. Google ID-token sign-in is
disabled.

Test cards: only `4000 0000 0000 0002` is declined; any other 16-digit number with a valid
expiry, CVC and name succeeds (for example `4242 4242 4242 4242`). Only the card's
brand and last four digits are stored, and the server computes the amount.

```bash
npm run build        # type-check (site + server) and build the site into build/
npm test             # vitest: server (in-memory PGlite) and site logic
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
| `GET /api/me/sessions` | active sessions, the current one marked (no tokens or IPs) |
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

Accounts are real: sign-up sends a confirmation email (link valid 24 hours) and you can sign in
right away, but checkout needs a confirmed email. Password reset links are single-use and valid
1 hour; a reset signs out all sessions. Sessions last 30 days. In Settings, users can turn
two-step sign-in (TOTP and backup codes) on and off and change their name. They can also:

- change their email, but only once the current email is confirmed; the change takes effect when
  the link sent to the new address is opened. Only the browser session that asked for the change
  stays signed in; every other session ends, and opening the link elsewhere (another browser or
  device) confirms the address without signing anyone in there. Those links are single-use;
- change their password, which ends their other sessions;
- list active sessions (the "This device" badge marks the current one) and sign out on all devices,
  which also signs out the current one;
- delete the account: a password is required, and Google-only accounts confirm with a recent
  sign-in instead.

Users who signed up with Google have no password; they set one through "Forgot password".

The seed runs on every start. It restores the demo subscription, devices or payments only when the
demo user has none of that kind, so deleting all of the demo devices (or payments) brings them back
on the next start, while deleting just one does not. Use `npm run db:reset` for a clean slate.

Payments are simulated: no money is charged and no card is stored. Contact, affiliate, partner and
newsletter forms still show a success message without sending anything.

## Deploying

Not set up yet; this is future work. The API reads its settings from the environment
(`.env.example` lists them).

- `DATABASE_URL` (external Postgres) is not wired up yet: the server fails at start if it is set.
  Only the local PGlite database works for now.
- SMTP is required in production. Without `SMTP_*`, mail is not delivered at all: every message,
  including live password-reset and confirmation links, is stored in the `dev_mail` table and
  printed in the server log, while `/dev/mail` is turned off.
- Do not copy `.env.example` to production unchanged: the server refuses to start in production
  while either `SEED_*` password is still the public example value (`admin-password`,
  `demo-password`). Set your own values, or remove both `SEED_*` variables to skip seeding.
- `NODE_ENV=production` needs `BETTER_AUTH_SECRET` (at least 32 characters, and not the
  development fallback secret), serves cookies as
  `Secure` (so the site must be on HTTPS), and turns off `/dev/mail`.
- Behind a reverse proxy, the rate limit keys on `X-Forwarded-For`, so the proxy must overwrite that
  header with the client address, for example in nginx
  `proxy_set_header X-Forwarded-For $remote_addr;`. This is the header named in
  `advanced.ipAddress.ipAddressHeaders` in `server/auth.ts`. If the proxy does not set it, all
  clients share one rate-limit bucket.
- The API listens on `127.0.0.1` only, so the proxy must run on the same machine.
- The site uses client-side routing, so whatever serves `build/` must fall back to `index.html` for
  unknown paths and pass `/api/*` to the API server.
