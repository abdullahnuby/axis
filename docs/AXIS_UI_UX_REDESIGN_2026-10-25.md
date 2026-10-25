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

- `src/app/page.tsx`: rebuilt the public landing page with a designed hero, onboarding path, transparent privacy disclosure, and CTA/footer.
- `src/components/CommunityBlueprint.tsx`: custom SVG-based engineering illustration for the landing hero.
- `src/components/AppShell.tsx`: reworked workspace navigation, member profile card, calculated profile completeness, and privacy/community guidance rails.
- `src/components/FeedClient.tsx`: added member-space hero and strengthened post/card hierarchy.
- `src/components/PeopleClient.tsx`, `GroupsClient.tsx`, `MessagesClient.tsx`, `NotificationsClient.tsx`: purpose-built directory, group, inbox, and activity-center headers with real state/counts.
- `src/components/VerificationClient.tsx`: state-aware visual journey through membership data, review, and access.
- `src/components/SettingsClient.tsx`: account-control introduction with actual email verification state.
- `src/app/globals.css`: foundational tokens and shared responsive styles.
- `src/app/axis-experience.css`: bespoke screen compositions loaded after `globals.css`.
- `src/app/layout.tsx`: loads the experience layer, sets AXIS navy browser theme, and keeps pinch-to-zoom enabled.
- `scripts/smoke-check.mjs`: checks custom compositions and accessibility behavior.
- `CHANGELOG.md`: recorded the UI/UX refresh.
- `.github/workflows/quality.yml`: added CI for `npm test` and `npm run typecheck` on the UI branch and pull requests.
- `docs/AXIS_UI_UX_REDESIGN_2026-10-25.md`: this handoff and explicit privacy/product-scope notes.

No database migration or API behavior change is intended in this pass.

## Product-truth / privacy boundary

The current implementation still renders posts under the member account identity; the feed copy explicitly says the post appears under the account name. Anonymous posting / verified anonymous aliases are **not implemented by this visual refresh**. The UI has not been changed to falsely imply that anonymous mode is available or to promise that administrators cannot identify a member. This should be treated as a separate, high-priority product feature requiring explicit identity/visibility rules, server-side enforcement, and regression/security tests before public launch.

## Validation

- **Current branch:** `ui/axis-design-system-2026-10`; draft review PR: https://github.com/abdullahnuby/axis/pull/1.
- **Static regression suite and TypeScript:** both `npm test` and `npm run typecheck` passed for code commit `68b40412fb0b973c27444d37bd466d330e9502b9` in GitHub Actions run https://github.com/abdullahnuby/axis/actions/runs/40208829180.
- **Vercel preview:** Ready for the tested code commit at https://axis-6b709wcah-abdullahelmassry-7339s-projects.vercel.app.
- **Visual review on real desktop/iOS/Android devices:** not yet performed. Review directory card wrapping, group hero balance, message/notification count panels, verification progress steps, and fixed mobile navigation before merging.
- **Production alias:** intentionally untouched. These changes remain isolated from production.
