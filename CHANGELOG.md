## Unreleased — professional profile and verification administration

- Rebuilt the profile page around a verified professional identity, real approved credentials, editable public details, actual authored posts, and a clear privacy note. No placeholder posts or unverified badges are invented.
- Expanded the admin verification screen into a request table + selected-applicant review panel on desktop, with selectable mobile cards, document links, decision inputs, and clear approve / request-more-info / reject actions.
- Split the admin overview into pending, needs-more-information, verified-member, and open-report counters.
- Added an admin-only API and UI for reviewing recent actions from `audit_logs`.
- Added responsive CSS and static smoke coverage for profile data and admin review workflows.

# Changelog

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
