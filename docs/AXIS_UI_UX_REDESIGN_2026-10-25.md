# AXIS UI/UX Redesign Handoff — 2026-10-25

## Goal

Give the existing AXIS product a coherent, professional visual language across the public landing page, authenticated workspace, feed, directory, groups, profiles, conversations, notifications, registration/login, verification, settings, legal pages, and admin workspace — while preserving current product routes, API contracts, database schemas, and interactions.

## Design direction

- **Brand:** deep engineering navy with a clear blue action color and teal as the AXIS signature accent.
- **Surface system:** quiet cool-gray canvas, white surfaces, thin blue-gray borders, restrained shadows, consistent radii and deliberate spacing.
- **Typography:** keep IBM Plex Sans Arabic and the existing RTL-first content model; improve heading and body hierarchy.
- **Interaction:** consistent button/input states, clear keyboard focus, lighter hover feedback, and reduced-motion support.
- **Responsive behavior:** three-column community workspace on wide screens, two-column tablet workspace, and a touch-first mobile experience with safe-area aware bottom navigation.
- **Accessibility:** restore browser zoom on mobile; provide visible focus rings and honor reduced-motion preferences.

## Files changed

- `src/app/globals.css`: appended the cohesive responsive design-system layer and screen-specific refinements.
- `src/app/layout.tsx`: aligned the browser theme color with AXIS navy and removed viewport settings that blocked pinch-to-zoom.
- `scripts/smoke-check.mjs`: added regression checks for the design tokens, responsive navigation, motion/accessibility styles, and zoom capability.
- `CHANGELOG.md`: recorded the UI/UX refresh.
- `.github/workflows/quality.yml`: added CI for `npm test` and `npm run typecheck` on the UI branch and pull requests.
- `docs/AXIS_UI_UX_REDESIGN_2026-10-25.md`: this handoff and explicit privacy/product-scope notes.

No database migration or API behavior change is intended in this pass.

## Product-truth / privacy boundary

The current implementation still renders posts under the member account identity; the feed copy explicitly says the post appears under the account name. Anonymous posting / verified anonymous aliases are **not implemented by this visual refresh**. The UI has not been changed to falsely imply that anonymous mode is available or to promise that administrators cannot identify a member. This should be treated as a separate, high-priority product feature requiring explicit identity/visibility rules, server-side enforcement, and regression/security tests before public launch.

## Validation

- **Vercel preview build:** completed with status `READY` for the UI and content changes at commit `9eea7cc0675ee9aed10ce6492e4b5d10eb6578b3`. Preview: https://axis-4rl21tgk1-abdullahelmassry-7339s-projects.vercel.app. Later changes are limited to documentation and CI trigger optimization.
- **GitHub Actions:** the latest pull-request job for commit `9eea7cc0675ee9aed10ce6492e4b5d10eb6578b3` passed `npm test` and `npm run typecheck` (run `40206857659`).
- **Static regression suite:** passed after refreshing stale copy assertions, restoring the missing `.env.example`, and adding checks for the responsive design tokens and accessible zoom.
- **Live visual review on real desktop/iOS/Android devices:** not yet performed. Use the preview link on target devices to check spacing, fixed navigation, and auth/verification flows.
- **Production alias:** intentionally untouched. Changes are isolated to branch `ui/axis-design-system-2026-10`.
