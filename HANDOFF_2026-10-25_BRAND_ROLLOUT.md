# AXIS brand rollout — handoff

## Objective
Adopt the user-approved AXIS reference as the visual identity for the existing platform without embedding the uploaded reference-board image across screens.

## Applied design decisions
- **Brand colors:** AXIS blue `#007BFF`, cyan `#00C4CC`, deep navy, and cool off-white surfaces.
- **Full logo:** symbol + `AXIS` + `SOCIAL MEDIA PLATFORM`, used in the landing-page brand moment and supplied as reusable light/dark SVG assets.
- **Compact brand:** symbol + AXIS wordmark in shared navigation, headers, sign-in/sign-up and administration.
- **Symbol only:** browser/app icons and a subtle professional-profile-cover watermark.
- **PWA:** app-tile SVG and regenerated 192/512/maskable/Apple PNGs; service-worker cache bumped to v3 to invalidate older branding assets.
- **No reference-board image embedded** in any page or asset.

## Main files
- `src/components/AxisLogoMark.tsx` — reusable vector symbol.
- `src/components/Brand.tsx` — compact, full-lockup, and symbol-only variants.
- `src/app/page.tsx` — full lockup in the landing brand area.
- `src/components/ProfileClient.tsx` — symbol-only profile-cover watermark.
- `src/app/globals.css` — brand palette and contextual logo sizing.
- `src/app/layout.tsx`, `public/manifest.webmanifest`, `public/sw.js`, `public/offline.html` — browser/PWA branding and cache version.
- `public/axis-logo.svg`, `public/axis-logo-dark.svg`, `public/axis-logo.png`, `public/axis-mark.svg`, `public/icons/axis-app-icon.svg`, `public/icons/*.png` — reusable logo deliverables.
- `docs/BRAND_GUIDE.md` — usage guidance.

## Verification results
- `node scripts/smoke-check.mjs`: **20 passed**.
- `node scripts/pwa-check.mjs`: **11 passed**.
- TypeScript transpile syntax check: **63 files, 0 syntax diagnostics**.
- PostCSS parsing of `src/app/globals.css`: **passed**.
- SVG-to-PNG rendering for the light lockup, dark lockup, and app icon: **passed**.
- PNG dimensions and opaque corners validated for 192, 512, maskable 512, and Apple 180 icons.
- Full `npm run typecheck` / `npm run build`: **not confirmed** because `node_modules` is not installed here. A standalone `tsc --noEmit` attempt cannot resolve `next`, `react`, `pg`, or Node type dependencies and therefore is not a valid full project typecheck.
- GitHub push / Vercel deployment: **not performed**. The attached ZIP is the edited project package; the live website has not changed from this workspace.
