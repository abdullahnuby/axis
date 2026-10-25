# AXIS — Action Audit & Launch Readiness

**Audit date:** 2026-10-25  
**Scope:** current source tree: account/authentication, feed/posts, comments/replies, groups, directory/profile, messaging, notifications, administration, PWA and database migrations.

## Executive summary

AXIS now has a substantial MVP feature set, but the production deployment is **not yet confirmed launch-ready**. The current Vercel project status was `ERROR` at the latest inspected deployment, with a TypeScript error in `src/app/people/[username]/page.tsx`: an inferred profile record was too narrow for the `PublicProfileClient` props. The source in this package contains explicit query result types for that page, but a complete `next build` has not been re-run because `npm install` timed out in the working environment.

Current checks in this source tree:

- `npm test`: **40 static checks passed**.
- `npm run pwa:check`: **11 checks passed**.
- TypeScript/TSX syntax transpilation: **95 files, 0 syntax errors**.
- CSS parsing: passed in the previous source validation; no CSS changes were made in the last action-audit pass.
- Full TypeScript typecheck and production build: **not verified**.
- Live end-to-end testing against production Neon/Vercel: **not performed**.
- Read-only Neon check: the admin record exists with `role=admin`, `verification_status=verified`, and `account_status=active`; its `email_verified_at` is still null.
- Vercel environment check: only `APP_URL`, `DATABASE_URL`, `DATA_ENCRYPTION_KEY`, and `MEMBERSHIP_HMAC_KEY` were listed. `RESEND_API_KEY` (and a configured sender) are absent, so email delivery workflows cannot be considered operational.
- Read-only schema check: production `public.comments` has `parent_comment_id` but lacks `edited_at`, which the edit API currently writes.

Static checks verify source patterns and expected routes; they do not prove a browser button succeeds against production credentials or data.

## Action-by-action review

| Area | Actions reviewed | Current source status | Remaining caveat |
|---|---|---|---|
| Sign in / registration | submit credentials, create account, logout, admin login | API-backed; server validates active account and role, sessions use HttpOnly cookie | Needs production smoke test after successful deployment |
| Email verification / reset | resend verification, verify token, request reset, reset password | API routes and one-time token tables exist | Delivery depends on email provider configuration (Resend environment); no live delivery test |
| Main feed | create post, attach one image, specialty filter, following-only, load older posts | API-backed; paginated; controls wired | Image limit is small and storage is in Postgres; no multi-image/video support |
| Post like / edit / delete | toggle like, edit content/specialty, delete own content, moderator/admin permissions | API-backed; confirmation/loading/error handling present | Latest fixes are not on production until a successful deployment |
| Share / repost | repost into own profile and feed | Internal repost backed by `shared_post_id`; external share sheet removed | No group destination yet. Deleting the original now preserves reposts with a notice that the source is unavailable |
| Comments / replies | create, reply, like/unlike, edit, delete subtree, report | UI and APIs now implement these actions with ownership/moderator checks, rate limits and counts | Live Neon lacks `comments.edited_at`; apply the provided migration before testing edits |
| Group posts | create, like, edit, delete, inline comments/replies/likes/edit/delete/report | Actions are wired in source; group comment affordance now opens comments inline rather than a feed URL that excluded group posts | Group posts remain text-only; sharing into groups is not implemented |
| Group membership | join public, request closed-group access, cancel pending request, accept/reject request, leave | APIs and UI flows present | Test member/owner/non-member permissions with real accounts |
| People directory / public profiles | search, specialty filter, pagination, open another profile, follow/unfollow, start message, report account | API-backed; profile deep links available; profile posts link back to the discussion | No avatars/photos uploaded by users; deeper social discovery is still basic |
| Own profile | edit display name/specialty/bio, edit/delete own post, open its discussion | API-backed controls; direct discussion link added during this audit | No profile avatar/cover upload; profile-post engagement is opened in feed rather than a fully embedded thread |
| Direct messages | start conversation, send, edit own message, soft-delete own message | API-backed; authorization checks membership and sender identity | Polling rather than realtime; no attachment upload/read receipts/push; delete is a conversation-wide placeholder, not per-user hide |
| Notifications | open notification, mark one read, mark all read | Click waits for read acknowledgement; failures are surfaced; targets route to related areas | No Web Push / mobile push, delivery can be polling-based |
| Admin verification | select applicant, view documents, accept/reject/request more information | Admin/reviewer API-backed; source has document access checks | Needs live document-access tests for each role |
| Admin members | suspend / reactivate | API-backed, confirmation and session invalidation on suspension | Need verify all role combinations against real accounts |
| Admin reports | review/dismiss, delete reported post/comment, suspend reported member | Fixed so `actioned` means an actual action ran; confirmation and audit log are used; moderators cannot suspend accounts | Deleting source posts preserves reposts, but this behavior needs UI/E2E validation |
| Admin events / audit | create/delete events, refresh dashboard, view audit history | API-backed and admin-only audit screen | Needs authorization and destructive-action tests against live DB |
| PWA / mobile | install prompt, standalone manifest, service worker | Static checks pass; service worker avoids API/private-route caching | Does not provide offline feed writes or offline sync; iOS/Android install not tested on real devices |

## Fixes included in this audit package

1. Added explicit result types for the public-person query to address the latest observed Vercel type error.
2. Added an inline comment thread for posts inside groups; the old link sent users to the global feed even though that feed excluded group posts.
3. Added a direct “عرض النقاش” link to each own-profile post.
4. Disabled the account-suspension action for moderators in the admin interface; the API already reserves it for `admin`.
5. Prevented deleting a source post from cascading away other members’ reposts. Reposts are detached from the source and receive a notice that the source is unavailable before the original is removed. The same behavior is used by the admin report action.
6. Kept API-backed edit/delete/report flows with explicit errors, loading state, rate limits and server-side authorization from the earlier action-audit work.

## Required before public launch

### P0 — Build and database compatibility

1. Push this source, then get a successful Vercel Production build. The current latest inspected build failed with the public-profile TypeScript error; this package fixes that exact inference problem but must be built to reveal any following errors.
2. Apply `db/migrations/20261025_action_audit_fixes.sql` using the Neon owner/migration role. The inspected live Neon `public.comments` table lacked `edited_at`, while the comment edit API writes it. Do not use the limited `axis_app` role for DDL unless it has explicit migration privileges.
3. Confirm that all migrations in `db/migrations/20261025_one_sprint.sql` were applied only once/with their documented idempotent semantics and that production points at the intended Neon project/branch.
4. Run a browser smoke test with two verified accounts: create/edit/delete post; create/reply/edit/delete comment; like/unlike post and comment; repost; delete source and confirm repost remains; group request/cancel/accept/leave; follow/unfollow; start/send/edit/delete message; read one/all notifications; moderation actions; suspended-session invalidation.

### P1 — Security and operations

- Configure `RESEND_API_KEY` and a verified sender in Vercel, then test email delivery, password reset, and verification end-to-end; the inspected Vercel project currently has no Resend key, so these flows cannot deliver mail yet.
- Test CSRF/same-origin protections, brute-force/rate limits, file type/size validation, private group visibility, document authorization, and every admin role against the live database.
- Set up backups and restore testing for Neon, error monitoring, and a data-retention/deletion procedure for verification documents and user content.
- Move user images and verification files out of Postgres once the platform is more than a small pilot; adopt private object storage with signed access.

### P2 — Product gaps before calling it a mature social platform

- Group-post images and in-group reposting are not implemented.
- No profile avatar/cover uploader.
- Direct messaging has no realtime transport, attachments, typing indicator, or delivery/read receipts.
- Notifications do not have Web Push or native mobile push.
- No moderation queue for spam/duplicate behavior beyond current rate limits, and no full end-user block/mute controls.
- No export/deletion flow for all personal data, public Terms/Privacy screens, or accessibility review.
- The application disables page zoom per the earlier request; this may harm low-vision accessibility. The more accessible alternative is to keep pinch zoom available while avoiding iOS input auto-zoom using 16px controls.
- There is no end-to-end test suite yet. Static smoke checks must not be presented as production integration tests.

## Migration needed for comment editing

The current inspected production database already contains `parent_comment_id` and `comment_likes`, but was missing `comments.edited_at`. The included standalone migration is idempotent and safe to re-run:

```sql
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS edited_at timestamptz;
CREATE INDEX IF NOT EXISTS comments_parent_idx ON public.comments (parent_comment_id, created_at ASC);
CREATE INDEX IF NOT EXISTS comment_likes_user_idx ON public.comment_likes (user_id);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages (conversation_id, created_at DESC);
```

## Release gate

Do **not** invite the public yet. Release only after (a) Vercel Production build is `READY`, (b) the comment-edit migration is applied, and (c) the two-account browser smoke test succeeds on the actual deployed URL. The current package is an audited candidate source drop, not a claim that production has already been updated.
