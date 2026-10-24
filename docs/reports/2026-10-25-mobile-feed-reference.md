# AXIS mobile feed reference-matching — 2026-10-25

## Requested outcome
Implement the supplied compact mobile feed reference: minimal header, horizontal specialty chips, compact composer, dark event banner, concise post cards, combined like/comment counts, and bottom navigation with a create-post action.

## Files changed
- `src/components/FeedClient.tsx`
- `src/components/AppShell.tsx`
- `src/components/AppHeader.tsx`
- `src/app/globals.css`
- `scripts/smoke-check.mjs`
- `CHANGELOG.md`
- `MOBILE_FIRST_HANDOFF.md`

## Verification records
- Static smoke test: 11 checks expected after running `node scripts/smoke-check.mjs`.
- PWA checks: `node scripts/pwa-check.mjs` (8 checks).
- Full typecheck/build: not verified; npm dependencies were unavailable in this runtime.
- Deployment: not performed.

## Notes
The mobile visual rules are scoped to `max-width:760px`; desktop layout and existing routes/API actions are preserved. The compose shortcut uses `/feed#compose`. No database migration was needed.
