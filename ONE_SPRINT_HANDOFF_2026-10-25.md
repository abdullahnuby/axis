# AXIS — One Sprint Handoff

Date: 2026-10-25

## Sprint outcome

This sprint expands AXIS from a closed engineering-community MVP toward a fuller professional social network. It builds on the existing profile, admin, mobile-first, PWA, and blue/cyan brand work; it does not replace the product or add a second profile/admin experience.

### Included in this source bundle

- Existing profile and admin review surfaces are retained and expanded.
- People directory with verified/active-member lookup, specialty filters, pagination, public member profiles, follow/unfollow, and follow notifications.
- Public and closed engineering groups, group discovery, membership and join requests, owner/admin approval controls, and group text-post feeds with closed-group access checks.
- One-to-one private conversations, sending messages, last-read/unread counters, notifications, and client polling refresh.
- Feed cursor pagination, following scope, post editing/deletion checks, in-platform reposts, nested comment replies, comment/reply likes, reports, and post/comment notifications.
- Password-reset and email-confirmation token routes use hashed one-time tokens and expiration.
- Persistent database-backed rate limiting for sensitive write/auth operations.
- PWA manifest, offline page, install UI, brand icons, and a service worker limited to safe static assets.
- Mobile-first compact composer, single specialty dropdown, larger mobile text/touch targets, approved AXIS blue/cyan visual identity, and less formal Arabic copy.
- Regression smoke tests and PWA checks.

## Validation run in this environment

- `node scripts/smoke-check.mjs` — **29 passed**.
- `node scripts/pwa-check.mjs` — **11 passed**.
- TypeScript parser pass over `src/` and `scripts/` — **91 TS/TSX files, 0 syntax parse errors**. This is a syntax check, not a TypeScript typecheck.
- PostCSS parse of `src/app/globals.css` — **passed, 722 top-level nodes**.
- `npm install --ignore-scripts --no-audit --no-fund --prefer-offline --progress=false` — timed out in the isolated environment. `node_modules` therefore was not available to run a trustworthy full typecheck or production build.
- No browser-level end-to-end suite against live Neon/Vercel was run.

## Important limits still to validate or complete

- `npm run typecheck` and `npm run build` must pass after dependencies install. Do not treat syntax checks as a replacement.
- The consolidated migration targets an existing AXIS schema with the base tables already present. Apply `db/migrations/20261025_one_sprint.sql` to the existing `neondb/main` database as the database owner/migration role, not the limited `axis_app` role. Back up the database first. The migration is designed to preserve existing users/posts/comments and to be re-runnable for these additions, but should still be applied to a backup/branch first when possible.
- Configure `RESEND_API_KEY`, `EMAIL_FROM` (a verified sender), and the correct production `APP_URL` on Vercel for real transactional email. Without these variables, outbound email cannot be delivered. Email-confirmation links are available when configured; this version does not hard-block all normal logins solely because email confirmation is pending.
- Group posts currently support text only. Group photos, group invites, and group-level notification controls are not included.
- One-to-one messages refresh by polling, not WebSockets/realtime push. No push notification service is configured.
- In-platform reposts currently target the member's profile/main feed; reposting directly to groups is not implemented yet.
- No production deployment, live Neon migration, real-mail send, backup restore, or mobile browser acceptance test was performed in this sprint environment.

## Release steps

1. Work on a branch or keep a restore point for the existing repository.
2. Copy this bundle's root files over the repository root; do not commit secrets or `.env.local`.
3. Install dependencies and verify:

   ```bash
   npm install
   npm run typecheck
   npm test
   npm run pwa:check
   npm run build
   ```

4. Back up Neon or create a temporary branch. Apply `db/migrations/20261025_one_sprint.sql` to the existing database as an owner/migration role, then verify tables and indexes. If preparing a brand-new database instead, use `npm run db:migrate` with `DATABASE_URL_UNPOOLED` (or the owner `DATABASE_URL`) so the canonical `db/schema.sql` is applied.
5. Add email provider variables to Vercel if email is required; never commit the values to Git.
6. Deploy from the connected Git branch. Wait for Vercel `READY`; inspect build logs.
7. Run the manual release checklist below on a staging/preview deployment before production traffic.

## Manual release checklist

- New account and existing account login; admin/staff and member routing.
- Membership document upload, review/approve/reject, and access gates.
- People directory pagination, profile page, follow/unfollow.
- Public and closed group join flow; verify a non-member cannot read closed-group posts or post to the group.
- Private conversation creation, message sending, unread counters, and participant-only access.
- Feed cursor pagination, specialty filtering, following feed, post edit/delete, in-platform repost, comment/reply creation, comment likes, and report flow.
- Password reset and email confirmation with the real configured provider; expired and reused tokens must fail.
- PWA installation and service-worker behavior on mobile; verify private pages/API responses are not cached.
- Desktop and mobile visual checks, focus/touch behavior, no automatic input zoom, and screen-reader/keyboard review.
- Confirm backups and perform a restore test before broad launch.

## Delivery boundary

This bundle is a code handoff only. It has **not** been pushed to GitHub, deployed to Vercel, or applied to the live Neon database by this task. No live environment changes are implied by this report.
