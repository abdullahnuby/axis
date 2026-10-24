# AXIS visual identity guide

## Approved source direction
The supplied AXIS reference uses a blue/cyan orbital engineering symbol, a dark-blue AXIS wordmark, and the descriptor “SOCIAL MEDIA PLATFORM”. The interface accent palette is now `#007BFF` (AXIS blue), `#00C4CC` (AXIS cyan), and a deep navy for surfaces and typography.

## Use the correct asset for each context
- `public/axis-logo.svg`: primary horizontal lockup (symbol + AXIS + descriptor) for brand-led surfaces and external use.
- `public/axis-logo-dark.svg`: same full lockup for dark backgrounds.
- `public/axis-mark.svg`: symbol only; use for low-space and watermark contexts.
- `public/icons/axis-app-icon.svg` and its PNG exports: symbol centered on the app tile for PWA, favicon, and home-screen use.
- `src/components/AxisLogoMark.tsx`: vector symbol used in React interfaces so it stays sharp at every size.
- `src/components/Brand.tsx`: compact wordmark in navigation/auth screens; `variant="lockup"` is reserved for the main landing brand moment; `variant="mark"` is symbol-only.

## Do not
- Do not reuse the uploaded brand-board image as an image on every page. It is a reference sheet, not a UI asset.
- Do not show the full lockup in every navigation/header. Use compact wordmark in the top bar and sidebar, a faint symbol watermark on profiles, and symbol-only app icons.
- Do not stretch or recolor the logo ad hoc; keep the supplied blue/cyan palette and preserve clear space.
