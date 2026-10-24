# Changelog

## Unreleased — mobile-first and PWA foundation

- Added an Arabic RTL web app manifest, theme/viewport metadata, Apple web-app metadata, and purpose-made install icons for Android/iOS.
- Added an install helper with iOS Add to Home Screen instructions and Chromium's native install prompt support.
- Added a service worker that only caches public, versioned static assets and the generic offline page. Private routes, APIs, session responses, and uploaded post images are not cached.
- Refined small-screen layout: compact header with expandable search, safer mobile navigation spacing, two-column glossary cards, more usable touch targets, responsive auth/profile/compose forms, and horizontally scrollable admin navigation.
- Added a direct path from the admin dashboard into `/feed`; regular login now directs staff accounts into the platform feed, while the dedicated admin login continues to route to `/admin`.
- Replaced the admin account's misleading public JNR badge with an AXIS administration label in profile, feed composer, posts, and comments.
- Restored the missing `.env.example` template expected by the repository's own smoke test, without adding credentials.
- Added `npm run pwa:check` and documented PWA setup and limits.
