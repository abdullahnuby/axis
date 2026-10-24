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
