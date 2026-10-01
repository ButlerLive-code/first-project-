# LaslesVPN

Multi-page React site built from the "FREEBIES Landingpage LaslesVPN" Figma community design.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build into build/
npm test             # vitest suite
npm run i18n:scan    # check for untranslated strings
npm run lint
```

Requires Node.js 22.22+ (react-router 8).

## What's inside

- `src/pages/` — every route: landing, sign-in/up, checkout, dashboard, download, tutorials,
  locations, countries, servers, FAQ, blog, about, help, affiliate, partners, privacy, terms.
- `src/components/` — landing sections, header/footer and shared UI.
- `src/i18n/` — English and Russian: dictionaries (`en.ts`, `ru.ts`), `/ru` routing helpers,
  the EN/RU switch, plural forms and date/price formatting. Long content lives in
  `src/data/*.en.ts` / `*.ru.ts`.
- `src/data/` — plans, servers (50+ in 30+ countries), platforms, FAQ, blog posts, legal texts.
- `src/auth/` — demo sign-in stored in the browser's localStorage.
- `src/assets/` — illustrations and icons exported from Figma.

## Demo behaviour

The site is available in English (default) and Russian (`/ru/…`), with an EN/RU language switch
in the header.

This is a front-end demo with no backend. Accounts and the chosen plan are saved only in the
visitor's browser; passwords and card details are never stored or sent. Contact, affiliate,
partner and newsletter forms show a success message without sending anything.

## Deploying

The site uses client-side routing, so the host must serve `index.html` for unknown paths
(SPA fallback) — e.g. Netlify `_redirects` with `/* /index.html 200`, or `try_files $uri /index.html`
in nginx.
