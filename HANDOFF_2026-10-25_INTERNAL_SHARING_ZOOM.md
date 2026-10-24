# AXIS handoff — internal sharing and mobile zoom

## Scope delivered
- Replaced the browser/native OS share sheet and clipboard-only fallback with an in-product “مشاركة داخل AXIS” dialog.
- “مشاركة على حسابي” creates a new post by the current verified user with `shared_post_id` pointing to the original. The repost appears in the main feed and in the user's existing `/profile` page.
- Re-sharing a repost resolves to the original post, avoiding wrapper-on-wrapper nesting.
- Feed API now returns original author/content/image metadata for rendering a nested, recognizable original-post preview.
- Added an idempotent Neon migration at `db/migrations/20261025_internal_post_sharing.sql` and updated `db/schema.sql`. No existing post content is deleted.
- Added mobile viewport limits (`minimumScale: 1`, `maximumScale: 1`, `userScalable: false`) and CSS `touch-action: manipulation` to prevent double-tap zoom. Mobile input/select/textarea font-size is forced to 16px to prevent iOS focus zoom.
- Documented the migration step in README.

## Tests executed
- `node scripts/smoke-check.mjs`: 22 static checks passed.
- `node scripts/pwa-check.mjs`: 11 checks passed.
- TypeScript `transpileModule` syntax pass on the 7 changed TS/TSX files: no syntax errors.
- `node --check` for the smoke/PWA scripts: passed.

## Not verified in this environment
- Full `npm run typecheck` and `npm run build` were not run because project dependencies are not installed in the local execution workspace. The deployment environment must run these after installing dependencies.
- The SQL migration has not been applied to live Neon from this workspace.
- The deployment was not pushed to GitHub/Vercel from this workspace. The ZIP is source delivery only.

## Deployment steps
1. Apply `db/migrations/20261025_internal_post_sharing.sql` in Neon SQL Editor on the production `neondb` / `main` branch. The migration is idempotent.
2. Run `npm install`, `npm test`, `npm run pwa:check`, `npm run typecheck`, and `npm run build`.
3. Push the source to the connected Git branch and verify the Vercel deployment is READY.
4. Test internal share on a real post: it should create a repost under the current user's profile and appear in the feed, with the source author/content embedded. Verify original images remain visible.
5. On iPhone/iOS, test tapping buttons and focusing the comment/share inputs. Browser pinch zoom is deliberately restricted as requested; note this reduces the user's ability to magnify content for accessibility.
