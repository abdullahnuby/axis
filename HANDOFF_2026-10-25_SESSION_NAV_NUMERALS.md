# AXIS Handoff — Session navigation, create-post action, and Latin numerals

**Date:** 2026-10-25  
**State:** Source changes implemented; static checks pass; not deployed.

## User requests addressed

1. Welcome page should only appear while signed out. An authenticated request to `/` now redirects to `/feed` for verified users/staff or `/verification` for other authenticated members. The authenticated top-bar logo now links to `/feed`. The welcome page remains reachable after sign-out.
2. The login form has a “تذكرني على هذا الجهاز” checkbox, unchecked by default. Unchecked sessions use a browser-session cookie (no `Max-Age`) and a 24-hour server-side expiry. Checked sessions use a persistent cookie with 30-day browser and server expiry. Registration and administrative login remain browser-session by default.
3. The central mobile navigation action is now “إنشاء”. It opens and focuses the composer from `/feed`, or navigates to `/feed?compose=1` then opens/focuses it from other app pages.
4. Removed the events/news strip from the feed, removed the common sidebar events/news panel, and removed the feed's event API request. The existing “choose what interests you” specialty panel remains.
5. Converted UI Arabic-Indic digit literals to Western digits and changed formatted date/count locales to `ar-EG-u-nu-latn` so Arabic text keeps its language while numerals stay Western.

## Files changed

- `src/app/page.tsx` — redirect authenticated visitors away from welcome page, simplify signed-out actions.
- `src/components/Brand.tsx`, `src/components/AppHeader.tsx` — configurable logo destination, application logo targets feed.
- `src/components/AuthForm.tsx`, `src/app/api/auth/login/route.ts`, `src/lib/auth.ts` — remember-me form/API and session-cookie lifetimes.
- `src/app/api/auth/register/route.ts`, `src/app/api/admin/login/route.ts` — browser-session sessions by default.
- `src/components/MobileCreatePostButton.tsx` — new client-side bottom-navigation action.
- `src/components/AppShell.tsx`, `src/components/FeedClient.tsx` — functional create action, composer focus, event UI removal.
- `public/manifest.webmanifest`, `public/sw.js` — session-aware root start URL and service-worker cache v5.
- `src/app/globals.css` — remember-me and button styling; removed unused event-strip styling.
- TS/TSX files throughout `src/` — Western digits and Arabic locale with Latin digit numbering.
- `scripts/smoke-check.mjs`, `scripts/pwa-check.mjs`, `CHANGELOG.md` — regression coverage and handoff documentation.

## Tests and command outcomes

- `npm test`: **50 static smoke checks passed**.
- `npm run pwa:check`: **13 PWA checks passed**.
- TypeScript `transpileModule` syntax pass: **104 TS/TSX files scanned, 0 syntax errors**.
- Full TypeScript typecheck: **not run**; `node_modules` is absent.
- `next build`: **not run**; dependencies are absent.
- Browser E2E: **not run**.
- Vercel deployment: **not performed**.

## Session-cookie behavior caveat

The unchecked option uses a standard browser-session cookie, which browsers normally clear when the browser session ends. Some browsers can restore session cookies when “restore previous session” is enabled; server expiry caps the session at 24 hours. The checked option intentionally persists for 30 days.

## Manual acceptance tests before deployment

1. Log in with “تذكرني” unchecked; verify `/` and the top-bar logo route to `/feed`; close the browser normally, reopen and ensure the session is no longer active.
2. Log in with “تذكرني” checked; close/reopen the browser and confirm the session continues, then log out and confirm `/` shows the signed-out welcome page.
3. From another app page, tap the bottom “إنشاء” control; confirm it opens `/feed`, expands the composer, and focuses the text field. On `/feed`, confirm the same action opens/focuses in place.
4. Verify the event/news banner/card is absent on desktop and mobile, and the feed still loads correctly without requesting `/api/events`.
5. Check dates, follower/comment/message counts, admin counts, and numeric limits under Arabic UI; all displayed numerals should be Western (0–9).
6. Complete a real Vercel preview build and mobile Safari/Chrome testing before production deployment.

## Risks / follow-up

- The 30-day remember-me duration is a product decision; choose shorter or longer if policy requires.
- Full typecheck/build and end-to-end behavior remain unverified due missing dependencies and browser runner.
- These source changes are not deployed automatically.
