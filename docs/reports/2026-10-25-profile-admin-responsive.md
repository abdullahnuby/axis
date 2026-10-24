# AXIS — Profile & Admin Review Handoff (2026-10-25)

## Scope
This update modifies the user-provided AXIS project archive. It has not been pushed to GitHub or deployed to Vercel.

## Profile page
- Reworked `src/components/ProfileClient.tsx` to show the signed-in account's actual identity, membership state, seniority level, approved badges, job title, specialty, approved years of experience, bio, and recent authored posts.
- Profile posts and counters are queried from Neon server-side (`src/app/profile/page.tsx`). No static/placeholder posts are displayed; an explicit empty state is shown when the member has not posted.
- The edit form is now revealed by the profile action. It edits only allowed public fields; approved seniority and credentials remain read-only and admin-reviewed.
- Added a privacy note explaining that membership numbers and verification documents are not public, plus standalone profile navigation optimized for mobile.

## Admin verification workspace
- Changed `src/components/AdminClient.tsx` from a vertical sequence of request cards and a form below them to a two-pane review workspace: request table/list plus selected applicant details and decision panel.
- Desktop displays a compact table and a review panel; narrow screens swap the table for large tappable request cards and place the review panel beneath it.
- The detail panel presents the actual applicant/account data, membership number (restricted to privileged review routes), uploaded document links, qualification fields, note, and the existing approval / more-info / rejection API actions.
- Split `pending` and `needs_info` counts in `/api/admin/overview` so the four dashboard cards describe distinct statuses.
- Added `/api/admin/audit`, restricted to `admin` role, and a `سجل القرارات` view backed by the existing `audit_logs` table.

## Validation
- `node scripts/smoke-check.mjs`: passed — 14 static checks.
- `node scripts/pwa-check.mjs`: passed — 8 PWA checks.
- Global TypeScript `transpileModule` parse: 60 TypeScript/TSX files parsed with zero syntax diagnostics.
- `tsc --noEmit`: not verified; this archive environment lacks installed Next.js, React, Lucide, Postgres, and Node type packages. Compiler output is dominated by missing-module/type-declaration errors. This is not a successful type check.
- `npm run build`: not verified because dependencies are not installed here.
- No live database actions were run by these UI updates. The audit route reads existing `audit_logs`; overview query now counts the two request states separately.

## Changed files
- `src/components/ProfileClient.tsx`
- `src/app/profile/page.tsx`
- `src/components/AdminClient.tsx`
- `src/app/api/admin/overview/route.ts`
- `src/app/api/admin/audit/route.ts` (new)
- `src/app/globals.css`
- `scripts/smoke-check.mjs`
- `CHANGELOG.md`
- `MOBILE_FIRST_HANDOFF.md`

## Deployment
To validate in a network-enabled environment, run `npm install`, `npm run pwa:check`, `npm test`, `npm run typecheck`, and `npm run build`, then push the reviewed source to the Git branch connected to Vercel. After deploying, test the profile with both an account that has approved credentials and the AXIS admin account, then test the verification page with pending, `needs_info`, approved, rejected, and no-request states. Confirm that reviewer/moderator roles cannot open the audit endpoint.
