# Changelog

## 2026-10-26 — Match current client-confidentiality guidance in CI

- Updated the legal-page smoke assertion to match the existing advice to hide client names and identifying data from uploaded material.

## 2026-10-26 — Match current group-leave confirmation wording

- Updated the destructive-action smoke assertion to the actual group-leave confirmation copy used by the current GroupDetailClient.

## 2026-10-26 — Make environment template placeholders explicit

- Added safe, clearly non-secret placeholders for the pooled/direct Neon URLs and both 64-character hex keys, matching the setup documentation and smoke checks. These values must be replaced before local use.

## 2026-10-26 — Update mobile zoom accessibility regression check

- The mobile smoke check now verifies that page zoom remains enabled for accessibility while form controls retain 16px sizing and touch-friendly behavior.

## 2026-10-26 — Refresh internal repost copy assertion

- Updated the smoke check to match the current “إعادة نشر داخل AXIS” dialog heading for the in-platform repost flow.

## 2026-10-26 — Update feed copy regression assertions

- Synced feed/profile smoke assertions to the current Arabic headings and profile hero structure, keeping the regression test aligned with the shipped UI copy.

## 2026-10-26 — Move navigation smoke checks to ShellNav

- Updated route-navigation assertions to inspect the shared `ShellNav` source, where the current destinations are defined, instead of looking for route entries in `AppShell`.

## 2026-10-26 — Refresh mobile navigation smoke assertions

- Updated static checks to match the current shared `MobileNav` component and its actual destinations instead of the removed `MobileCreatePostButton` component.

## 2026-10-26 — Correct comment API smoke matcher

- Updated the feed interaction regression check to match the actual `loadComments(postId)` API URL template, so it validates the implementation rather than an obsolete local variable name.

## 2026-10-26 — Align smoke checks with App Router route groups

- Updated stale page paths to the current `src/app/(app)` group and aligned the feed guard assertion with the intended registered-member preview. Profile, settings, and notifications remain verification-gated.

## 2026-10-26 — Restore environment template required by setup and CI

- Restored the documented `.env.example` template with variable names and safe blank placeholders only; it contains no production secrets.
- Fixed the locale dictionary comma style after the audience-control change so the source remains parseable by both Next.js and the localization smoke check.

## 2026-10-26 — Admin curation of preview-post visibility

- Added an administrator-only control in each standalone feed post menu to switch audience between verified engineers and all registered members, including members awaiting verification.
- Kept the author-facing audience choice when a verified member creates a post; administrators can now correct that choice later without deleting or reposting the content.
- The API verifies same-origin requests and administrator role, excludes group posts, validates the selected audience, rate-limits changes, and records successful changes in `audit_logs`.
- Added Arabic/English UI labels and a static regression check for server authorization and audit logging.

## 2026-10-26 — Launch reliability fixes

- Fixed feed date formatting by separating the Arabic locale from the Latin-numbering option, preventing malformed duplicated Unicode locale extensions. Applied the same safe pattern to feed timestamps and counts.
- Normalized legacy PostgreSQL `sslmode` aliases to explicit `verify-full`, preserving full certificate verification while removing the driver deprecation warning.
- Routed Vercel functions to Frankfurt (`fra1`) to match the AXIS Neon database region and reduce cross-region request latency.
- Expanded CI to run static smoke checks, PWA checks, localization checks, TypeScript typechecking, and a production build on Node.js 24 (matching the Vercel runtime).
- Production was healthy before this change, but launch is not fully cleared until email delivery and real two-account end-to-end checks are verified.

## 2026-10-26 — Progressive membership access

- Added a registered-member preview feed with an explicit post audience setting.
- Kept pre-existing posts verified-only by default; an additive Neon migration adds the audience column and feed index without deleting content.
- Fixed a missing comma in the Arabic and English locale dictionaries that blocked the Vercel production build.

## 2026-10-25 — Opt-in mobile push notifications

- Added opt-in Web Push subscriptions for phones and installed AXIS web apps, including members who are waiting for verification.
- Added encrypted Web Push delivery for verification decisions, new messages, comment/post likes, comments, follows, post shares, and group-join approval notices; expired subscriptions are pruned.
- Added a settings control, a pre-verification setup control, and service-worker notification display/click-through behavior. iPhone users must add AXIS to the Home Screen before enabling push notifications.

## 2026-10-25 — Fix admin API route collision

- Matched the new verification route parameter to the existing member route (`[userId]`) so Next.js can register both paths without a dynamic-segment conflict.
- Fixed the production runtime failure that prevented admin members, verification requests, and overview APIs from loading. The account record was not deleted.

## 2026-10-25 — Incomplete registration verification queue

- The admin verification queue now includes active member accounts that have not created a verification request, so registered-but-unverified users no longer disappear from review.
- Added a safe action to reopen the verification step; it does not approve the account. The member must still submit a request with the required syndicate membership number.
- Added audit logging, overview counts, and a regression check for the missing-request case.

## 2026-10-25 — Optional membership card

- The syndicate membership number remains required, but uploading the card image is now optional in the verification form and API.
- The admin review panel explains when no card image was attached.
- Added regression checks for this flow.

## 2026-10-25 — Shorter post previews

- Reduced the feed post preview from 90 words to 20 words before “عرض المزيد” for a more compact reading experience, especially on mobile.
- Updated the static regression check to assert the 20-word preview limit.

## Unreleased — one-sprint social network foundation

- Added a searchable, verified-member directory and public professional profile routes, follow/unfollow actions, and follow notifications.
- Added public/closed engineering groups, owner membership controls, join requests, group post feeds, and closed-group post visibility checks.
- Added private one-to-one conversations, message sending, unread counters, polling refresh, and message notifications.
- Added password reset and email-confirmation flows that use one-time hashed tokens and Resend when configured; documented required environment variables.
- Added cursor pagination and a "following" feed scope, post editing/deletion validation, in-platform internal repost behavior, and a dedicated mobile create-post action.
- Added hashed persistent database-backed rate limits for registration, password reset/email verification, posting, comments, follows, group creation/joining, sharing, reports, likes, and direct messages.
- Added an idempotent database migration for social graph, groups, messaging, token storage, notification targets, and rate limiting. Added smoke tests for the new routes and nav.
- Production build/typecheck and live Neon integration are still required before calling the Sprint production-ready; current checks are static and syntax-level in this environment.

## Unreleased — professional profile and verification administration

- Rebuilt the profile page around a verified professional identity, real approved credentials, editable public details, actual authored posts, and a clear privacy note. No placeholder posts or unverified badges are invented.
- Expanded the admin verification screen into a request table + selected-applicant review panel on desktop, with selectable mobile cards, document links, decision inputs, and clear approve / request-more-info / reject actions.
- Split the admin overview into pending, needs-more-information, verified-member, and open-report counters.
- Added an admin-only API and UI for reviewing recent actions from `audit_logs`.
- Added responsive CSS and static smoke coverage for profile data and admin review workflows.


## Unreleased — reference-matched mobile feed

- Reordered the mobile feed to match the supplied reference: specialty chips at the top, a compact one-line composer, a dark engineering-events strip, compact post cards, and a fixed four-action bottom navigation.
- Replaced the duplicated engagement summary/action rows with a single compact like/comment action row that keeps live counts and existing API actions.
- Simplified mobile post metadata, attachment sizing, and spacing while preserving the desktop feed and the underlying authentication, membership and posting behavior.
- Added a dedicated “New post” navigation action that scrolls to the composer.
- Added smoke coverage for the reference-matched order and mobile controls.

## Unreleased — professional feed refresh

- Rebuilt the feed header, verified-community cue, post composer, specialty filter strip, post cards, comment threads, and empty/loading states for a more deliberate professional-network experience.
- Added image previews and size validation before upload; removed browser prompt reporting in favor of an inline, accessible report form.
- Replaced the previously inert post overflow control with a real menu for reporting or deleting the current user's post.
- Added relative post/comment timestamps, specialty topic labels, verified-member indicators, tap-sized actions, and improved mobile layout rules.
- Extended static smoke tests to cover feed structure, responsive styles, and real API wiring.

## Unreleased — mobile-first and PWA foundation

- Added an Arabic RTL web app manifest, theme/viewport metadata, Apple web-app metadata, and purpose-made install icons for Android/iOS.
- Added an install helper with iOS Add to Home Screen instructions and Chromium's native install prompt support.
- Added a service worker that only caches public, versioned static assets and the generic offline page. Private routes, APIs, session responses, and uploaded post images are not cached.
- Refined small-screen layout: compact header with expandable search, safer mobile navigation spacing, two-column glossary cards, more usable touch targets, responsive auth/profile/compose forms, and horizontally scrollable admin navigation.
- Added a direct path from the admin dashboard into `/feed`; regular login now directs staff accounts into the platform feed, while the dedicated admin login continues to route to `/admin`.
- Replaced the admin account's misleading public JNR badge with an AXIS administration label in profile, feed composer, posts, and comments.
- Restored the missing `.env.example` template expected by the repository's own smoke test, without adding credentials.
- Added `npm run pwa:check` and documented PWA setup and limits.

## 2026-10-25 — image-guided existing profile/admin screens
- Updated the existing `/profile` screen to follow the reference hierarchy: top bar, profile cover card, inline verified badge, real profile posts, biography, and approved credentials.
- Aligned the existing `/admin` review tab with the reference wording and its responsive two-column request/review workspace; audit history stays inside the same admin page and uses a role-protected API endpoint.
- No new user-facing page routes were added for the profile/admin redesign.


## 2026-10-25 — feed social interactions and build fix
- Fixed the `ProfileClient.tsx` TypeScript error from calling `Map.has` with a general string by typing the badge-label lookup as `Map<string, string>`.
- Added database-backed reply threading with `parent_comment_id`, and a `comment_likes` table with a unique (comment, user) key. Existing comments are preserved by idempotent schema upgrades.
- Added API support for threaded comments and toggle-like actions on comments/replies.
- Added post sharing through Web Share on supported devices, clipboard fallback elsewhere, and a direct `?post=...#post-...` link that retrieves the requested post instead of assuming it is among the newest 50.
- Added a per-comment reply composer, like count and state, child replies, and deletion of a comment with its descendants for permitted users. Corrected a duplicate comment-count increment.
- Expanded desktop feed layout and comment-action styling while preserving mobile feed layout.


## 2026-10-25 — approved AXIS logo and visual identity rollout

- Rebuilt the supplied reference as clean vector assets instead of embedding the design-board image: a blue engineering-A/orbital symbol, cyan orbit, AXIS wordmark, and the descriptor `SOCIAL MEDIA PLATFORM`.
- Added primary light and dark lockups (`public/axis-logo.svg`, `public/axis-logo-dark.svg`) and a symbol-only SVG (`public/axis-mark.svg`).
- Replaced the prior compass/gold symbol in React with the same vector mark and generated PWA/app icons from a dedicated vector tile.
- Applied `#007BFF` blue, `#00C4CC` cyan, and deep navy tokens across the interface; state colors remain semantic for success and error states.
- Applied context-aware identity: full lockup in the landing brand area; compact symbol + AXIS in headers/auth/navigation; symbol-only profile-cover watermark; symbol-only app and browser icons.
- Bumped the public-static service-worker cache version so updated icons are not hidden behind the previous cached assets.
- Added smoke and PWA checks for logo assets, colors, and contextual logo usage.


## 2026-10-25 — mobile readability and social-language pass

- Removed the oversized decorative feed intro/hero from the rendered Feed component; desktop content now starts directly with the composer, and the mobile flow retains filters, composer, event strip, and posts.
- Added a final responsive typography layer: mobile post bodies are 15.5px, comment bodies 14.5px, form input/textarea 16px, filters and actions 12.5–13.5px, and bottom-nav labels 11.5px with larger touch targets.
- Rewrote visible copy across the feed, composer, empty states, share/report feedback, profile, verification, notifications, settings, authentication, home page, and sidebar to sound warmer and more like a community conversation while keeping the admin workflow precise.
- Replaced the user-facing “الموجز” term with “الرئيسية”, “آخر المشاركات”, or context-specific wording; updated the manifest shortcut and page metadata.
- Added a regression test to ensure the Feed hero and stale terminology do not return.

## 2026-10-25 — Compact composer and single specialty filter
- Mobile composer now starts as a compact horizontal entry bar and expands only on demand.
- Removed repeated specialty chips and replaced them with one dropdown beside the latest-posts heading.
- Preserved the dark events strip under the composer and retained the richer desktop editor.
- Added static smoke-check guards for the new layout.


## 2026-10-25 — Responsive feedback, profile media, and PWA onboarding

- Success/error feedback now portals to `document.body` so transformed page containers cannot trap the notification; toast is viewport-fixed and non-layout-shifting.
- Feed post/comment edit and delete use their confirmed API response to update local UI immediately; removed redundant background re-fetches that could overwrite the just-applied state.
- Profile avatar and cover controls are available directly on the profile header without first entering profile-details edit mode.
- Avatar and cover uploads are normalized with Sharp to WebP, orientation-corrected, resized, and pixel-limited before storage to reduce database size and reject problematic images.
- Group discussion cards, group composer, and pending-member lists use the same profile-avatar component.
- iPhone install instructions retain a clear in-site guide because the browser's share sheet is owned by iOS; if the action is missing, the guide directs the user to Edit Actions or Safari.

- App navigation now shows a per-user unread notification badge; the count refreshes on focus/visibility and on a 30-second interval. The notifications list refreshes while visible, so updates arrive without a manual page reload.
- Added public privacy, terms-of-use, and community-guideline pages, linked from the landing page and authenticated app footer. The text is an operational draft and requires local legal review before broad public launch.
- Bumped the public-static service-worker cache from v3 to v4 so existing installs replace the cached set on the next update.
- Added regression coverage for public policy pages and their app-wide links.


## 2026-10-25 — Session navigation and feed cleanup

- Authenticated visits to `/` now redirect to `/feed` (or `/verification` while membership is not yet verified); the welcome page is for signed-out visitors. The application header logo links directly to `/feed`.
- Standard login includes an unchecked-by-default “تذكرني على هذا الجهاز” option. Unchecked login uses a browser-session cookie; checked login uses a persistent cookie with a 30-day lifetime. Registration and admin login remain browser-session cookies by default.
- Changed the mobile bottom-center action from a decorative navigation link named “مشاركة” to a working “إنشاء” button that opens and focuses the feed composer from any app page.
- Removed the feed event/news strip and the events/news card from the common app sidebar. The feed no longer makes an events API call just to render posts.
- Replaced Arabic-Indic digits with Western digits in UI literals and applied the `ar-EG-u-nu-latn` locale for formatted counts and dates across TypeScript/TSX sources.
- Changed the PWA start URL to `/` so session-aware routing can choose the welcome page or feed, and bumped the service-worker cache to v5.
- Added five regression checks covering home redirect, remembered sessions, the create-post action, event-strip removal, and Latin digits.
- Validation: `npm test` (50 static checks) and `npm run pwa:check` (13 checks) pass; TypeScript syntax transpilation passes for 104 TS/TSX files. A full `tsc --noEmit` and Next production build were not run because project dependencies are not installed in this workspace.

## 2026-10-25 — Arabic/English interface support

- Added a persistent language switcher available across public, authentication, community, profile, messaging, and administration screens.
- Added an Arabic-to-English UI dictionary for common navigation, forms, feed actions, profiles, groups, messages, notifications, settings, verification, and administration text.
- Selecting English changes the document language and direction to LTR; Arabic remains the default RTL language.
- Language preference is saved in local storage. User-authored post and message body content is intentionally not machine-translated.
- Validation note: repository writes were committed through GitHub. A local TypeScript/build run was not available through this editing session; check the Vercel deployment and CI result after the commit.
