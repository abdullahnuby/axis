# AXIS launch reliability follow-up — 26 October 2026

## Observed before the fix

- The latest production deployment at review time was `READY` on commit `3d86bc023836928aa1a3e6a4c082fbe7adf37490`; the landing page and public registration, login, recovery, legal, and admin-login pages returned HTTP 200.
- Earlier runtime logs recorded an invalid language tag (`ar-eg-u-nu-latn-u-nu-latn`) in feed rendering. Feed date, timestamp, and count formatting has been changed to use `ar-EG` plus the `numberingSystem: "latn"` option.
- Runtime logs repeatedly reported legacy PostgreSQL SSL-mode warnings and several `write ETIMEDOUT` errors in the older production deployment. The deployed function region was `iad1`, while the Neon project is in Frankfurt (`aws-eu-central-1`).
- The previously observed admin dynamic-route collision is already corrected in the current source: both member routes use the `[userId]` segment, and the latest build succeeded.

## Fixes in this change

- Normalize PostgreSQL connection-string `sslmode` values `prefer`, `require`, and `verify-ca` to explicit `verify-full`, retaining the current certificate-verification behavior.
- Set the Vercel function region to `fra1` to colocate application functions with Neon.
- Add regression assertions for date formatting, TLS configuration, and deployment region.
- Run `npm test` and `npm run pwa:check` in CI; use Node.js 24 in CI to match the configured Vercel runtime. CI continues to run localization checks, typecheck, and production build.

## Remaining release gates

- **Email delivery is not configured yet.** Vercel's environment-variable inventory did not include `RESEND_API_KEY` or `EMAIL_FROM`. Add a valid Resend API key and a verified sender, then test registration verification and password-reset emails end-to-end. These credentials cannot be inferred or fabricated.
- **End-to-end checks remain outstanding.** Validate the full member journey with two real accounts on mobile and desktop, including signup, verification, feed access gates, edit/delete/pin post flows, comments, groups, messages, notifications, and moderation.
- **Legal review remains outstanding.** Privacy, terms, and community guidelines are operational drafts and should be reviewed for the intended jurisdiction before opening registration broadly.

## Verification record

The commit and its Vercel deployment must be checked after this change is pushed. A successful build alone is not proof of email delivery or a complete end-to-end release.
