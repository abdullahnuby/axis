import { readFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), "utf8");
const exists = async (file) => { try { await access(path.join(root, file), fsConstants.F_OK); return true; } catch { return false; } };
const checks = [];
async function check(name, fn) { await fn(); checks.push(name); }
await check("core pages and admin entrypoints exist", async () => {
  for (const file of ["src/app/page.tsx", "src/app/register/page.tsx", "src/app/login/page.tsx", "src/app/verification/page.tsx", "src/app/feed/page.tsx", "src/app/admin/page.tsx", "src/app/admin/login/page.tsx", "db/schema.sql"]) assert.equal(await exists(file), true, `${file} missing`);
});
await check("one-sprint social graph, groups, direct messaging, recovery, and rate limits are database-backed", async () => {
  const schema = await read("db/schema.sql");
  const migration = await read("db/migrations/20261025_social_network_sprint.sql");
  const combinedMigration = await read("db/migrations/20261025_one_sprint.sql");
  const rateLimit = await read("src/lib/rate-limit.ts");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS user_follows/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS engineering_groups/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS conversations/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS messages/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS password_reset_tokens/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS email_verification_tokens/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS rate_limits/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.user_follows/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.messages/);
  assert.match(combinedMigration, /Source: 20261025_comment_interactions\.sql/);
  assert.match(combinedMigration, /Source: 20261025_internal_post_sharing\.sql/);
  assert.match(combinedMigration, /Source: 20261025_social_network_sprint\.sql/);
  assert.match(rateLimit, /createHash\("sha256"\)/);
  assert.match(rateLimit, /ON CONFLICT \(bucket, subject_hash\) DO UPDATE/);
});
await check("closed group posts are restricted to members and report endpoint respects private-group visibility", async () => {
  const groupRoute = await read("src/app/api/groups/[groupId]/posts/route.ts");
  const feedRoute = await read("src/app/api/feed/route.ts");
  const reportRoute = await read("src/app/api/posts/[postId]/report/route.ts");
  assert.match(groupRoute, /g\.visibility='public'/);
  assert.match(groupRoute, /group_members gm WHERE gm\.group_id=p\.group_id AND gm\.user_id=\$1 AND gm\.status='active'/);
  assert.match(feedRoute, /followingOnly|following/);
  assert.match(feedRoute, /before/);
  assert.match(reportRoute, /g\.visibility='public'/);
});
await check("people directory has load-more pagination and staff can reach admin from app header", async () => {
  const people = await read("src/components/PeopleClient.tsx");
  const header = await read("src/components/AppHeader.tsx");
  assert.match(people, /offset:String\(people\.length\)/);
  assert.match(people, /عرض مهندسين أكتر/);
  assert.match(header, /staff-admin-shortcut/);
  assert.match(header, /href="\/admin"/);
});
await check("email reset and verification are one-time token flows and use documented provider env vars", async () => {
  const reset = await read("src/app/api/auth/password-reset/route.ts");
  const resetRequest = await read("src/app/api/auth/password-reset-request/route.ts");
  const verify = await read("src/app/api/auth/verify-email/route.ts");
  const register = await read("src/app/api/auth/register/route.ts");
  const env = await read(".env.example");
  assert.match(reset, /FOR UPDATE/);
  assert.match(reset, /DELETE FROM sessions WHERE user_id/);
  assert.match(resetRequest, /expires_at/);
  assert.match(verify, /email_verified_at=now\(\)/);
  assert.match(register, /sendTransactionalEmail/);
  assert.match(env, /RESEND_API_KEY/);
  assert.match(env, /EMAIL_FROM/);
});
await check("one-sprint social pages and APIs exist", async () => {
  for (const file of [
    "src/app/people/page.tsx", "src/app/people/[username]/page.tsx", "src/app/groups/page.tsx",
    "src/app/groups/[groupId]/page.tsx", "src/app/messages/page.tsx", "src/app/messages/[conversationId]/page.tsx",
    "src/app/forgot-password/page.tsx", "src/app/reset-password/page.tsx", "src/app/verify-email/page.tsx",
    "src/app/api/people/route.ts", "src/app/api/groups/route.ts", "src/app/api/conversations/route.ts",
    "src/app/api/auth/password-reset-request/route.ts", "src/app/api/auth/verify-email/route.ts"
  ]) assert.equal(await exists(file), true, `${file} missing`);
});
await check("private community pages have server guards", async () => {
  assert.match(await read("src/app/feed/page.tsx"), /requireVerifiedPage/);
  assert.match(await read("src/app/profile/page.tsx"), /requireVerifiedPage/);
  assert.match(await read("src/app/settings/page.tsx"), /requireVerifiedPage/);
  assert.match(await read("src/app/notifications/page.tsx"), /requireVerifiedPage/);
  assert.match(await read("src/app/admin/page.tsx"), /requireAdminPage/);
  assert.match(await read("src/app/page.tsx"), /href="\/admin\/login"/);
});
await check("profile does not repeat a universal verification badge", async () => {
  assert.doesNotMatch(await read("src/components/ProfileClient.tsx"), /عضوية معتمدة/);
});
await check("professional profile shows real member posts and verified credentials", async () => {
  const profile = await read("src/components/ProfileClient.tsx");
  const page = await read("src/app/profile/page.tsx");
  assert.match(profile, /profile-content-grid/);
  assert.match(profile, /profile-credential-list/);
  assert.match(profile, /profile-empty-posts/);
  assert.match(page, /WHERE p\.author_id=\$1/);
  assert.match(page, /initialPosts=\{posts\.rows\.map/);
});
await check("admin verification workspace has selectable request table and separate review panel", async () => {
  const admin = await read("src/components/AdminClient.tsx");
  const styles = await read("src/app/globals.css");
  assert.match(admin, /admin-verification-table/);
  assert.match(admin, /admin-review-panel/);
  assert.match(admin, /admin-verification-mobile-list/);
  assert.match(styles, /\.admin-review-workspace/);
  assert.match(styles, /\.admin-verification-mobile-card/);
});
await check("admin action history is admin-only", async () => {
  const route = await read("src/app/api/admin/audit/route.ts");
  const admin = await read("src/components/AdminClient.tsx");
  assert.match(route, /user!\.role !== "admin"/);
  assert.match(route, /FROM audit_logs/);
  assert.match(admin, /api\/admin\/audit/);
  assert.match(admin, /سجل قرارات الإدارة/);
});
await check("feed API rejects unverified members", async () => {
  assert.match(await read("src/app/api/feed/route.ts"), /getApiUser\(\{ verified: true \}\)/);
});
await check("feed has professional post, composer, and mobile filter patterns", async () => {
  const feed = await read("src/components/FeedClient.tsx");
  const styles = await read("src/app/globals.css");
  assert.match(feed, /compose-professional/);
  assert.match(feed, /post-professional/);
  assert.match(feed, /feed-specialty-filter/);
  assert.match(feed, /PostSkeleton/);
  assert.match(feed, /post-report-panel/);
  assert.match(styles, /\.feed-page-intro/);
  assert.match(styles, /\.post-action-professional/);
  assert.match(styles, /@media\(max-width:760px\)/);
});
await check("feed post controls use real API actions and accessible states", async () => {
  const feed = await read("src/components/FeedClient.tsx");
  assert.match(feed, /api\/posts\/\$\{post\.id\}\/like/);
  assert.match(feed, /api\/posts\/\$\{post\.id\}\/comments/);
  assert.match(feed, /aria-pressed=\{post\.has_liked\}/);
  assert.match(feed, /aria-expanded=\{openComments === post\.id\}/);
});
await check("mobile feed uses a compact composer and a single dropdown filter", async () => {
  const feed = await read("src/components/FeedClient.tsx");
  const shell = await read("src/components/AppShell.tsx");
  const styles = await read("src/app/globals.css");
  assert.doesNotMatch(feed, /feed-mobile-filterbar/);
  assert.doesNotMatch(feed, /feed-filters-mobile|feed-filter-chip/);
  assert.match(feed, /compose-compact-bar/);
  assert.match(feed, /compose-expanded-content/);
  assert.match(feed, /setComposerExpanded\(true\)/);
  assert.match(feed, /id="feed-specialty-filter"/);
  assert.match(styles, /\.compose-compact-bar/);
  assert.match(styles, /\.compose-expanded-content\.is-open/);
  assert.match(styles, /\.feed-specialty-filter/);
  assert.match(feed, /feed-event-strip/);
  assert.match(feed, /compose-input-row/);
  assert.match(feed, /post-action-bar-compact/);
  assert.match(feed, /id="compose"/);
  assert.match(shell, /href="\/feed#compose"/);
  assert.match(styles, /\.feed-page-intro\{display:none!important\}/);
  assert.match(styles, /\.mobile-bottom \.mobile-compose-link/);
});
await check("mobile navigation includes a dedicated create-post action", async () => {
  const shell = await read("src/components/AppShell.tsx");
  assert.match(shell, /href="\/feed#compose"/);
  assert.match(shell, /mobile-compose-link/);
  assert.match(shell, /<Plus size=\{21\}/);
  assert.match(await read("src/components/FeedClient.tsx"), /id="compose"/);
});
await check("directory, groups, direct messaging, and account recovery are wired into navigation", async () => {
  const shell = await read("src/components/AppShell.tsx");
  assert.match(shell, /href: "\/people"/);
  assert.match(shell, /href: "\/groups"/);
  assert.match(shell, /href: "\/messages"/);
  assert.match(await read("src/components/AuthForm.tsx"), /href="\/forgot-password"/);
});
await check("feed removes the decorative hero, uses natural social copy, and keeps mobile text readable", async () => {
  const feed = await read("src/components/FeedClient.tsx");
  const profile = await read("src/components/ProfileClient.tsx");
  const verification = await read("src/components/VerificationClient.tsx");
  const styles = await read("src/app/globals.css");
  assert.doesNotMatch(feed, /<section className="feed-page-intro"/);
  assert.match(feed, /آخر المشاركات/);
  assert.match(feed, /إيه اللي حابب تشاركه مع زملائك/);
  assert.match(profile, /<span>الرئيسية<\/span>/);
  assert.doesNotMatch(feed + profile + verification, /الموجز/);
  assert.match(styles, /\.post-professional-body \{[^}]*font-size: 15\.5px !important/s);
  assert.match(styles, /\.mobile-bottom a \{[^}]*font-size: 11\.5px !important/s);
});
await check("post sharing is an in-platform repost to profile and feed, not an external share sheet", async () => {
  const feed = await read("src/components/FeedClient.tsx");
  const api = await read("src/app/api/posts/[postId]/share/route.ts");
  const schema = await read("db/schema.sql");
  const migration = await read("db/migrations/20261025_internal_post_sharing.sql");
  const profilePage = await read("src/app/profile/page.tsx");
  const profileClient = await read("src/components/ProfileClient.tsx");
  assert.doesNotMatch(feed, /navigator\.share|clipboard\.writeText/);
  assert.match(feed, /مشاركة داخل AXIS/);
  assert.match(feed, /confirmInternalShare/);
  assert.match(feed, /api\/posts\/\$\{sharingPost\.id\}\/share/);
  assert.match(feed, /shared-post-original/);
  assert.match(api, /getApiUser\(\{ verified: true \}\)/);
  assert.match(api, /INSERT INTO posts \(author_id, body, specialty, shared_post_id\)/);
  assert.match(schema, /shared_post_id uuid REFERENCES posts\(id\) ON DELETE CASCADE/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS shared_post_id/);
  assert.match(profilePage, /LEFT JOIN posts sp ON sp\.id=p\.shared_post_id/);
  assert.match(profileClient, /profile-shared-post-shell/);
});
await check("mobile zoom is disabled and form controls stay at 16px", async () => {
  const layout = await read("src/app/layout.tsx");
  const styles = await read("src/app/globals.css");
  assert.match(layout, /maximumScale: 1/);
  assert.match(layout, /userScalable: false/);
  assert.match(styles, /touch-action: manipulation/);
  assert.match(styles, /font-size: 16px !important/);
});
await check("comment replies and comment likes are database-backed", async () => {
  const schema = await read("db/schema.sql");
  const commentsApi = await read("src/app/api/posts/[postId]/comments/route.ts");
  const likeApi = await read("src/app/api/comments/[commentId]/like/route.ts");
  const feed = await read("src/components/FeedClient.tsx");
  const types = await read("src/lib/types.ts");
  assert.match(schema, /parent_comment_id uuid REFERENCES comments\(id\) ON DELETE CASCADE/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS comment_likes/);
  assert.match(commentsApi, /parentCommentId/);
  assert.match(commentsApi, /COUNT\(cl\.user_id\)::int AS like_count/);
  assert.match(likeApi, /INSERT INTO comment_likes/);
  assert.match(feed, /toggleLikeComment/);
  assert.match(feed, /setReplyTargets/);
  assert.match(feed, /comment-replies/);
  assert.match(types, /parent_comment_id: string \| null/);
  assert.match(types, /has_liked: boolean/);
});
await check("feed is improved for wide desktop while retaining mobile actions", async () => {
  const styles = await read("src/app/globals.css");
  const feed = await read("src/components/FeedClient.tsx");
  assert.match(styles, /@media\(min-width:1160px\)/);
  assert.match(styles, /grid-template-columns:220px minmax\(540px,760px\) 280px/);
  assert.match(styles, /\.comment-replies/);
  assert.match(styles, /\.post-share-action/);
  assert.match(feed, /<Share2 size=\{15\}/);
  assert.match(feed, /post-engagement-summary/);
});
await check("profile persisted badge values no longer fail the Map type check", async () => {
  const profile = await read("src/components/ProfileClient.tsx");
  assert.match(profile, /new Map<string, string>\(BADGE_OPTIONS\.map/);
});

await check("membership is encrypted and duplicate checked", async () => {
  const crypto = await read("src/lib/crypto.ts");
  const verify = await read("src/app/api/verification/route.ts");
  assert.match(crypto, /aes-256-gcm/);
  assert.match(crypto, /createHmac\("sha256"/);
  assert.match(verify, /membership_number_encrypted/);
  assert.match(verify, /membership_fingerprint/);
});
await check("admin login is separate and rate limited", async () => {
  const page = await read("src/app/admin/login/page.tsx");
  const api = await read("src/app/api/admin/login/route.ts");
  assert.match(page, /AuthForm mode="admin"/);
  assert.match(api, /loginBlocked/);
});
await check("sensitive documents are limited to admin/reviewer", async () => {
  assert.match(await read("src/app/api/admin/documents/[documentId]/route.ts"), /\["admin", "reviewer"\]/);
  assert.match(await read("src/app/api/admin/verifications/route.ts"), /\["admin", "reviewer"\]/);
});
await check("AXIS logo uses the approved blue/cyan mark and full descriptor", async () => {
  const logo = await read("public/axis-logo.svg");
  const mark = await read("public/axis-mark.svg");
  const markComponent = await read("src/components/AxisLogoMark.tsx");
  assert.match(logo, /AXIS/);
  assert.match(logo, /SOCIAL MEDIA PLATFORM/);
  assert.match(logo, /#007BFF/);
  assert.match(logo, /#00C4CC/);
  assert.match(mark, /viewBox="0 0 160 160"/);
  assert.match(markComponent, /linearGradient/);
});
await check("logo assets are used contextually, not as a repeated board image", async () => {
  const brand = await read("src/components/Brand.tsx");
  const homepage = await read("src/app/page.tsx");
  const header = await read("src/components/AppHeader.tsx");
  const profile = await read("src/components/ProfileClient.tsx");
  const admin = await read("src/components/AdminClient.tsx");
  const styles = await read("src/app/globals.css");
  assert.match(brand, /"compact" \| "lockup" \| "mark"/);
  assert.match(homepage, /Brand variant="lockup" light/);
  assert.match(header, /<Brand \/>/);
  assert.match(profile, /AxisLogoMark className="profile-cover-mark"/);
  assert.match(admin, /<Brand admin light \/>/);
  assert.match(styles, /--blue:#007BFF/);
  assert.match(styles, /--teal:#00C4CC/);
  assert.doesNotMatch(homepage + header + profile + admin, /<img[^>]+axis-logo\.png/);
});
await check("secrets stay out of git", async () => {
  const gitignore = await read(".gitignore");
  assert.match(gitignore, /\.env\.\*/);
  assert.match(gitignore, /!\.env\.example/);
  const env = await read(".env.example");
  assert.match(env, /REPLACE_WITH_64_HEX_CHARACTERS/);
  assert.match(env, /YOUR-ENDPOINT/);
  assert.match(env, /USER:PASSWORD/);
});
console.log(`AXIS static smoke checks: ${checks.length} passed`);
for (const name of checks) console.log(`✓ ${name}`);
