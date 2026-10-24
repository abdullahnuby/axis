# AXIS visual identity rollout — 2026-10-25

## Request
Adopt the supplied AXIS logo reference across all existing product pages. Do not use the uploaded logo-board image as a repeated image asset; recreate the mark as vector paths and place the correct logo variant according to context.

## Brand system
- Blue: `#007BFF`
- Cyan: `#00C4CC`
- Wordmark / dark surfaces: deep navy
- Descriptor in the primary lockup: `SOCIAL MEDIA PLATFORM`

## Contextual use
- Landing brand moment: horizontal full lockup (symbol + AXIS + descriptor).
- Main top bar, login/register, verification and app navigation: compact symbol + AXIS wordmark only.
- Admin sidebar: compact mark + wordmark + administration label.
- Professional profile cover: subtle symbol-only watermark.
- PWA, Apple touch icon, and browser icon: symbol only on a dedicated app tile.
- Offline page: symbol tile and text descriptor, not the whole reference board.

## Files changed
- `src/components/AxisLogoMark.tsx`
- `src/components/Brand.tsx`
- `src/app/page.tsx`
- `src/components/ProfileClient.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `public/axis-logo.svg`, `public/axis-logo-dark.svg`, `public/axis-logo.png`, `public/axis-mark.svg`
- `public/icons/axis-app-icon.svg`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, `public/icons/apple-touch-icon.png`
- `public/manifest.webmanifest`, `public/offline.html`, `public/sw.js`
- `scripts/smoke-check.mjs`, `scripts/pwa-check.mjs`, `CHANGELOG.md`, `BUILD_STATUS.md`

## Verification
- Static smoke checks: **20 passed**.
- PWA checks: **11 passed**.
- TypeScript syntax transpile: **63 files, 0 syntax diagnostics**; PostCSS CSS parse passed; SVG exports rendered successfully.
- TypeScript/build: not verified because `node_modules` is absent in this sandbox. Running `tsc --noEmit` without dependencies produces module-resolution errors, not a valid project typecheck.
- No Vercel deployment was triggered.
