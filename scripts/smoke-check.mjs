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
  assert.match(feed, /feed-filters/);
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
await check("mobile feed matches compact reference layout", async () => {
  const feed = await read("src/components/FeedClient.tsx");
  const shell = await read("src/components/AppShell.tsx");
  const styles = await read("src/app/globals.css");
  assert.match(feed, /feed-mobile-filterbar/);
  assert.match(feed, /feed-event-strip/);
  assert.match(feed, /compose-input-row/);
  assert.match(feed, /post-action-bar-compact/);
  assert.match(feed, /id="compose"/);
  assert.match(shell, /href="\/feed#compose"/);
  assert.match(styles, /\.feed-page-intro\{display:none!important\}/);
  assert.match(styles, /\.mobile-bottom \.mobile-compose-link/);
});
await check("feed sharing opens a selected post through a stable shared link", async () => {
  const feed = await read("src/components/FeedClient.tsx");
  const api = await read("src/app/api/feed/route.ts");
  assert.match(feed, /navigator\.share/);
  assert.match(feed, /clipboard\.writeText/);
  assert.match(feed, /feed\?post=/);
  assert.match(feed, /id=\{`post-\$\{post\.id\}`\}/);
  assert.match(api, /sharedPostId/);
  assert.match(api, /p\.id=\$4::uuid/);
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
