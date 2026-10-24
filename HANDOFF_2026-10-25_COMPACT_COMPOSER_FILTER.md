# AXIS Handoff — Compact Composer and Professional Feed Filter

Date: 2026-10-25

## Request
- Replace the tall mobile post composer with the agreed compact horizontal entry bar.
- Remove the repeated horizontal specialty chips.
- Provide one clean specialty dropdown beside the latest-posts heading, under the events strip.

## Changes
- `src/components/FeedClient.tsx`: removed the separate mobile filter chip strip and the desktop chip rail; added a single `feed-specialty-filter` select beside `آخر المشاركات`.
- Replaced the always-visible mobile composer form with a collapsed row containing the member avatar, placeholder/action, and image shortcut. Tapping the prompt expands the editor; selecting an image also expands it. Draft text is preserved if the editor is collapsed. After a successful post, the editor resets to compact mode.
- Kept the existing rich composer on desktop; only mobile uses the compact-collapsible state.
- Kept the dark events strip directly below the composer. The filter now appears in the latest-posts header below the events strip.
- `src/app/globals.css`: added end-of-file responsive rules overriding earlier accumulated rules that had hidden the stream header on mobile and expanded the editor vertically.
- `scripts/smoke-check.mjs`: updated feed checks to guard against reintroducing category chips, and require the compact composer plus the single dropdown.

## Validation
- `npm test`: passed (22 static checks).
- `npm run pwa:check`: passed (11 PWA checks).
- TypeScript syntax transpilation: 63 `.ts`/`.tsx` files, 0 syntax errors. This is a syntax check, not a full TypeScript typecheck.
- PostCSS parse of `src/app/globals.css`: passed.
- Production build and full typecheck were not run because project dependencies are not installed in this environment.

## Deployment status
Changes are local to this ZIP. They have not been pushed to GitHub or deployed to Vercel. No production database migration is required for these layout-only changes.
