# AXIS Mobile-First / PWA Handoff

## Scope
This handoff describes changes made to the user-provided AXIS archive. It does not indicate that the modified archive has been deployed to Vercel or that the live site has changed.

## Changes
- PWA manifest at `public/manifest.webmanifest`, including RTL Arabic metadata, standalone display, shortcuts, and theme/background colors.
- PNG icons for general 192px/512px install purposes, a maskable 512px icon, and an Apple touch icon.
- `PWAProvider` registers the service worker over HTTPS (and localhost during development), captures install events, and detects iOS/standalone display.
- `PWAInstallButton` supports native install prompts and gives instructions for Add to Home Screen on iOS.
- `public/sw.js` caches only versioned Next static files and public icons. It never caches `/api/`, `/admin*`, login, register, verification, profile, feed, settings, or notifications. Navigation is network-first and shows a generic offline screen only when the request fails.
- Mobile CSS adjusts the header/search, bottom navigation safe area, forms, post actions/tap targets, responsive cards, profile, and a horizontal admin navigation bar.
- Added a separate admin-to-platform link and changed regular login / landing continuation so staff can enter the platform feed; the dedicated `/admin/login` path remains available for administration.
- Added role-aware public identity so the AXIS admin account does not appear as a junior engineer.
- Restored `.env.example`, which was missing from the supplied ZIP and caused the original smoke test to fail.

## Validation performed
- `npm run pwa:check`: passed (8 checks).
- `npm test`: passed (8 existing smoke checks) after restoring `.env.example`.
- `node --check public/sw.js`, `node --check scripts/pwa-check.mjs`, and `node --check scripts/smoke-check.mjs`: passed.
- TypeScript/TSX syntax transpilation via the installed global TypeScript compiler: 60/60 files parsed without syntax diagnostics.
- `npm install --no-audit --no-fund`: timed out in this environment; no `node_modules` directory was created.
- `tsc --noEmit`: could not be validated fully because Next.js, React, lucide-react, pg and type packages were unavailable after dependency installation timed out. The compiler output is dominated by missing dependency/type declarations. This is not a successful typecheck.
- Production `npm run build`: not run successfully because dependencies could not be installed in this environment.

## Security / leakage check
- No credentials were added to `.env.example` or project files.
- Service worker code deliberately bypasses private route and API requests; user content and session responses are not placed into Cache Storage.
- The PWA is not an offline social network: sign-in, feed, profile data, posting, and admin actions still require the backend and internet connection.

## Deployment steps
1. Review the diff and run `npm install`, `npm run pwa:check`, `npm test`, `npm run typecheck`, and `npm run build` in a network-enabled environment.
2. Push the reviewed files to the Git branch connected to Vercel. The deployment is not performed by this archive build.
3. After a READY deployment, test installation in iOS (Share → Add to Home Screen) and Android (Install app / Add to Home Screen), verify icons and standalone display, and check that logged-in data is never available from the service worker cache.
4. Test upgrade behavior after incrementing the static cache version in `public/sw.js` when the cached static bundle set changes.

## Changed and added files

Changed: `package.json`, `README.md`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/components/FeedClient.tsx`, `src/components/AdminClient.tsx`, `src/components/SettingsClient.tsx`, `src/components/ProfileClient.tsx`, `src/components/AppHeader.tsx`, `src/lib/types.ts`, `src/app/api/feed/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/posts/[postId]/comments/route.ts`.

Added: `.env.example`, `MOBILE_FIRST_HANDOFF.md`, `CHANGELOG.md`, `public/sw.js`, `public/manifest.webmanifest`, `public/offline.html`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, `public/icons/apple-touch-icon.png`, `scripts/pwa-check.mjs`, `src/components/PWAInstallButton.tsx`, `src/components/PWAProvider.tsx`.

## SHA-256 of key new/updated PWA files

```text
1d590301aeb8a2b7e76c1713fbb93e3233ee64edec38e7a38dd3df1c4adf3973  src/app/layout.tsx
617af98a81c6a0e7c613d4227b0c2ab1e591b32c06578368dd080fbc5ad2f2f0  src/app/globals.css
93fee6c69e51f979e28cc5885a4227f65199c443bb9e8be50551688e4b0b3f75  src/components/PWAProvider.tsx
f8f1ec18096c0db6ab1af9a85f701cc1608d9f3daaf7306dfb4c591c8e732ab2  src/components/PWAInstallButton.tsx
62fe42077e1d0c983c4bf739f72d55c7bfb9b8e0671127f21521687a8d1b5e58  public/manifest.webmanifest
e8e12fe2eb075a2d7a02f3fb8a36d142d8210e169fb824f58b4664820e91e6ca  public/sw.js
a98c2c84047bad1a82e2ee596d10067a6ba47f395b822dde724ac0b87bbde310  public/icons/icon-192.png
3df04fc11c1571c5be2ee6654d8b94ed939562e10f9ca3ace11d1e01bf25e4cd  public/icons/icon-512.png
c16e8b2e24e6114dae7a02b59dcd321732f9177dd1e85e0a3f8cc92272a08a2d  public/icons/icon-maskable-512.png
aa84ab36e787661f05130dc211e8ff998e36024bdc0e6b92f0e5e00ebbbf3ac5  public/icons/apple-touch-icon.png
76eadf2df78dc5ef0f94aed6a53d05b396e5468d5a9acb8551f38d07ad327fe4  scripts/pwa-check.mjs
```
