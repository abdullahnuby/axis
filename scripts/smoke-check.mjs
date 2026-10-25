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
  for (const file of ["src/app/page.tsx", "src/app/register/page.tsx", "src/app/login/page.tsx", "src/app/verification/page.tsx", "src/app/(app)/feed/page.tsx", "src/app/admin/page.tsx", "src/app/admin/login/page.tsx", "db/schema.sql"]) assert.equal(await exists(file), true, `${file} missing`);
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
  assert.match(people, /عرض (?:أعضاء|مهندسين) أكتر/);
  assert.match(header, /staff-admin-shortcut/);
  assert.match(header, /href="\/admin"/);
});
await check("email reset and verification are one-time token flows and use documented provider env vars", async () => {
  const reset = await read("src/app/api/auth/password-reset/route.ts");
  const resetRequest = await read("src/app/api/auth/password-reset-request/route.ts");
  const verify = await read("src/app/api/auth/verify-email/route.ts");
  const register = await read("src/app/api/auth/register/route.ts");
  const env = await read("README.md");
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
    "src/app/(app)/people/page.tsx", "src/app/(app)/people/[username]/page.tsx", "src/app/(app)/groups/page.tsx",
    "src/app/(app)/groups/[groupId]/page.tsx", "src/app/(app)/messages/page.tsx", "src/app/(app)/messages/[conversationId]/page.tsx",
    "src/app/forgot-password/page.tsx", "src/app/reset-password/page.tsx", "src/app/verify-email/page.tsx",
    "src/app/api/people/route.ts", "src/app/api/groups/route.ts", "src/app/api/conversations/route.ts",
    "src/app/api/auth/password-reset-request/route.ts", "src/app/api/auth/verify-email/route.ts"
  ]) assert.equal(await exists(file), true, `${file} missing`);
});
await check("private community pages have server guards", async () => {
  assert.match(await read("src/app/(app)/feed/page.tsx"), /requireVerifiedPage/);
  assert.match(await read("src/app/(app)/profile/page.tsx"), /requireVerifiedPage/);
  assert.match(await read("src/app/(app)/settings/page.tsx"), /requireVerifiedPage/);
  assert.match(await read("src/app/(app)/notifications/page.tsx"), /requireVerifiedPage/);
  assert.match(await read("src/app/admin/page.tsx"), /requireAdminPage/);
  assert.match(await read("src/app/page.tsx"), /href="\/admin\/login"/);
});
await check("profile does not repeat a universal verification badge", async () => {
  assert.doesNotMatch(await read("src/components/ProfileClient.tsx"), /عضوية معتمدة/);
});
await check("professional profile shows real member posts and verified credentials", async () => {
  const profile = await read("src/components/ProfileClient.tsx");
  const page = await read("src/app/(app)/profile/page.tsx");
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
  assert.match(feed, /api\/posts\/\$\{(?:post\.id|postId)\}\/comments/);
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
  assert.doesNotMatch(feed, /feed-event-strip/);
  assert.match(feed, /compose-input-row/);
  assert.match(feed, /post-action-bar-compact/);
  assert.match(feed, /id="compose"/);
  assert.match(shell, /<MobileCreatePostButton\/>/);
  assert.match(styles, /\.feed-page-intro\{display:none!important\}/);
  assert.match(styles, /\.mobile-bottom \.mobile-compose-link/);
});
await check("mobile navigation includes a dedicated create-post action", async () => {
  const shell = await read("src/components/AppShell.tsx");
  assert.match(shell, /<MobileCreatePostButton\/>/);
  const action = await read("src/components/MobileCreatePostButton.tsx");
  assert.match(action, /mobile-compose-link/);
  assert.match(action, /<Plus size=\{21\}/);
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
  const profilePage = await read("src/app/(app)/profile/page.tsx");
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
await check("group post comments use an inline working thread rather than a dead feed link", async () => {
  const groupDetail = await read("src/components/GroupDetailClient.tsx");
  const comments = await read("src/components/GroupPostComments.tsx");
  assert.match(groupDetail, /<GroupPostComments/);
  assert.match(groupDetail, /openCommentsPostId/);
  assert.doesNotMatch(groupDetail, /href=\{`\/feed\?post=\$\{p\.id\}`\}/);
  assert.match(comments, /api\/posts\/\$\{postId\}\/comments/);
  assert.match(comments, /api\/comments\/\$\{comment\.id\}\/like/);
  assert.match(comments, /method: "PATCH"/);
  assert.match(comments, /method: "DELETE"/);
  assert.match(comments, /api\/comments\/\$\{reporting\.id\}\/report/);
});
await check("own profile post cards have a working deep link to the discussion", async () => {
  const profile = await read("src/components/ProfileClient.tsx");
  assert.match(profile, /href=\{`\/feed\?post=\$\{encodeURIComponent\(post\.id\)\}`\}/);
  assert.match(profile, /عرض النقاش/);
});
await check("moderators cannot trigger account suspension from report UI", async () => {
  const admin = await read("src/components/AdminClient.tsx");
  const api = await read("src/app/api/admin/reports/[reportId]/route.ts");
  assert.match(admin, /report\.target_type === "user" && admin\.role !== "admin"/);
  assert.match(api, /if \(user!\.role !== "admin"\) throw/);
});
await check("deleting a source post preserves other members' reposts instead of cascading them away", async () => {
  const postApi = await read("src/app/api/posts/[postId]/route.ts");
  const adminReports = await read("src/app/api/admin/reports/[reportId]/route.ts");
  assert.match(postApi, /UPDATE posts SET body = CASE WHEN length\(btrim\(body\)\) > 0/);
  assert.match(postApi, /shared_post_id = NULL, updated_at = now\(\)\s+WHERE shared_post_id = \$1/s);
  assert.match(postApi, /withTransaction/);
  assert.match(adminReports, /الاحتفاظ بمشاركات الأعضاء التي كانت تشير إليه/);
});

await check("membership is encrypted and duplicate checked", async () => {
  const crypto = await read("src/lib/crypto.ts");
  const verify = await read("src/app/api/verification/route.ts");
  assert.match(crypto, /aes-256-gcm/);
  assert.match(crypto, /createHmac\("sha256"/);
  assert.match(verify, /membership_number_encrypted/);
  assert.match(verify, /membership_fingerprint/);
});
await check("membership number is required while the membership card image is optional", async () => {
  const verification = await read("src/components/VerificationClient.tsx");
  const api = await read("src/app/api/verification/route.ts");
  const upload = await read("src/lib/upload.ts");
  const admin = await read("src/components/AdminClient.tsx");
  const numberInput = verification.match(/<input id="membershipNumber"[^>]*>/)?.[0] ?? "";
  const cardInput = verification.match(/<input className="field" id="membershipProof"[^>]*>/)?.[0] ?? "";
  assert.ok(numberInput.includes("required"), "membership number should stay required");
  assert.ok(!cardInput.includes("required"), "membership card image should be optional");
  assert.ok(verification.includes("صورة كارنيه النقابة (اختياري)"));
  assert.ok(api.includes('if (membershipProof) files.push({ category: "membership", file: membershipProof });'));
  assert.ok(!api.includes('if (!membershipProof) return jsonError'), "API must accept a request without the card image");
  assert.ok(api.includes("membershipNumber.replace"), "membership number validation must remain");
  assert.ok(upload.includes('if (file.size === 0 && file.name === "") return null'));
  assert.ok(admin.includes("لم تُرفق صورة كارنيه النقابة"));
});
await check("registered members without verification requests appear in the admin queue but cannot be approved prematurely", async () => {
  const listApi = await read("src/app/api/admin/verifications/route.ts");
  const reopenApi = await read("src/app/api/admin/members/[userId]/reopen-verification/route.ts");
  const overviewApi = await read("src/app/api/admin/overview/route.ts");
  const admin = await read("src/components/AdminClient.tsx");
  assert.ok(listApi.includes("not_submitted"));
  assert.ok(listApi.includes("false AS request_exists"));
  assert.ok(listApi.includes("NOT EXISTS (SELECT 1 FROM verification_requests vr WHERE vr.user_id=u.id)"));
  assert.ok(reopenApi.includes("UPDATE users SET verification_status='needs_info'"));
  assert.ok(reopenApi.includes("verification_requests WHERE user_id=$1"));
  assert.ok(reopenApi.includes("verification_step_reopened"));
  assert.ok(overviewApi.includes("NOT EXISTS (SELECT 1 FROM verification_requests vr WHERE vr.user_id=u.id)"));
  assert.ok(admin.includes("إعادة فتح خطوة التوثيق"));
  assert.ok(admin.includes("لا يمكن اعتماد العضوية من هذه الشاشة قبل أن يدخل العضو رقم النقابة ويرسل الطلب"));
});

await check("mobile push subscriptions and service-worker notifications are opt-in and secure", async () => {
  const push = await read("src/lib/push.ts");
  const subscribeApi = await read("src/app/api/push/subscription/route.ts");
  const keyApi = await read("src/app/api/push/public-key/route.ts");
  const worker = await read("public/sw.js");
  const control = await read("src/components/PushNotificationsControl.tsx");
  const migration = await read("db/migrations/20261025_web_push_notifications.sql");
  assert.ok(push.includes("Content-Encoding: aes128gcm") || push.includes('"Content-Encoding": "aes128gcm"'));
  assert.ok(push.includes("createVapidAuthorization"));
  assert.ok(subscribeApi.includes("sameOrigin(request)"));
  assert.ok(subscribeApi.includes("ON CONFLICT(endpoint)"));
  assert.ok(subscribeApi.includes("WHERE push_subscriptions.user_id=EXCLUDED.user_id"));
  assert.ok(keyApi.includes("getVapidPublicKey"));
  assert.ok(worker.includes('self.addEventListener("push"'));
  assert.ok(worker.includes('self.addEventListener("notificationclick"'));
  assert.ok(control.includes("Notification.requestPermission()"));
  assert.ok(control.includes("install-required"));
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS public.push_subscriptions"));
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
  assert.match(header, /<Brand href="\/feed" \/>/);
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
await check("comment editing and deletion are API-backed with owner/moderator permissions and counts", async () => {
  const route = await read("src/app/api/comments/[commentId]/route.ts");
  const feed = await read("src/components/FeedClient.tsx");
  const comments = await read("src/app/api/posts/[postId]/comments/route.ts");
  const schema = await read("db/schema.sql");
  const migration = await read("db/migrations/20261025_one_sprint.sql");
  assert.match(route, /export async function PATCH/);
  assert.match(route, /edited_at=now\(\)/);
  assert.match(route, /removedCount/);
  assert.match(route, /moderator/);
  assert.match(feed, /saveCommentEdit/);
  assert.match(feed, /deleteComment/);
  assert.match(comments, /c\.edited_at/);
  assert.match(schema, /ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at timestamptz/);
  assert.match(migration, /ALTER TABLE public\.comments ADD COLUMN IF NOT EXISTS edited_at timestamptz/);
});
await check("profile-owned posts have working edit/delete controls", async () => {
  const profile = await read("src/components/ProfileClient.tsx");
  assert.match(profile, /savePostEdit/);
  assert.match(profile, /deleteProfilePost/);
  assert.match(profile, /api\/posts\/\$\{post\.id\}/);
  assert.match(profile, /حفظ التعديل/);
  assert.match(profile, /حذف/);
});
await check("direct messages support sender-only edits and soft deletion from UI and API", async () => {
  const client = await read("src/components/MessagesClient.tsx");
  const route = await read("src/app/api/conversations/[conversationId]/messages/[messageId]/route.ts");
  assert.match(client, /saveEdit/);
  assert.match(client, /deleteMessage/);
  assert.match(client, /تعديل الرسالة/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /existing\.sender_id !== user!\.id/);
  assert.match(route, /deleted_at=now\(\)/);
});
await check("comment and member reports can be filed and safely reviewed", async () => {
  const commentReport = await read("src/app/api/comments/[commentId]/report/route.ts");
  const personReport = await read("src/app/api/people/[userId]/report/route.ts");
  const feed = await read("src/components/FeedClient.tsx");
  const profile = await read("src/components/PublicProfileClient.tsx");
  const moderation = await read("src/app/api/admin/reports/[reportId]/route.ts");
  const admin = await read("src/components/AdminClient.tsx");
  assert.match(commentReport, /target_type='comment'/);
  assert.match(personReport, /target_type='user'/);
  assert.match(feed, /api\/comments\/\$\{comment\.id\}\/report/);
  assert.match(profile, /api\/people\/\$\{profile\.id\}\/report/);
  assert.match(moderation, /DELETE FROM posts/);
  assert.match(moderation, /DELETE FROM comments/);
  assert.match(moderation, /account_status='suspended'/);
  assert.match(admin, /applyReportAction/);
  assert.match(admin, /applyAction: true/);
});
await check("moderation buttons have explicit destructive confirmations", async () => {
  const admin = await read("src/components/AdminClient.tsx");
  const groups = await read("src/components/GroupDetailClient.tsx");
  const posts = await read("src/app/api/posts/[postId]/route.ts");
  assert.match(admin, /متأكد إنك عايز توقف حساب/);
  assert.match(admin, /ده إجراء فعلي/);
  assert.match(groups, /متأكد إنك عايز تغادر المجموعة/);
  assert.match(posts, /delete-post/);
  assert.match(posts, /sameOrigin/);
});
await check("notification buttons navigate only after read status is acknowledged", async () => {
  const client = await read("src/components/NotificationsClient.tsx");
  assert.match(client, /openNotification/);
  assert.match(client, /if \(!response\.ok\) throw new Error/);
  assert.match(client, /router\.push\(target\(item\)\)/);
});
await check("public-profile TypeScript query is explicitly typed to fix latest Vercel build failure", async () => {
  const page = await read("src/app/(app)/people/[username]/page.tsx");
  assert.match(page, /query<PublicProfileRecord>/);
  assert.match(page, /profile=\{\{\.\.\.profile,created_at:String\(profile\.created_at\),updated_at:String\(profile\.updated_at\)\}\}/);
});


await check("profile avatar and cover uploads are persisted, validated, and gated behind a verified session", async () => {
  const upload = await read("src/app/api/me/media/route.ts");
  const fetchMedia = await read("src/app/api/people/[userId]/media/route.ts");
  const profile = await read("src/components/ProfileClient.tsx");
  const schema = await read("db/migrations/20261025_profile_media.sql");
  assert.match(upload, /getApiUser\(\{ verified: true \}\)/);
  assert.match(upload, /parseSafeUpload/);
  assert.match(upload, /sharp\(/);
  assert.match(upload, /limitInputPixels/);
  assert.match(upload, /webp\(\{ quality: 84/);
  assert.match(upload, /avatar_image_data/);
  assert.match(upload, /cover_image_data/);
  assert.match(fetchMedia, /getApiUser\(\{ verified: true \}\)/);
  assert.match(fetchMedia, /X-Content-Type-Options/);
  assert.match(profile, /uploadProfileMedia/);
  assert.match(profile, /تغيير صورة الغلاف|تغيير الغلاف|إضافة غلاف/);
  assert.match(profile, /profile-avatar-edit/);
  assert.match(schema, /ADD COLUMN IF NOT EXISTS avatar_image_data/);
  assert.match(schema, /ADD COLUMN IF NOT EXISTS cover_image_data/);
});
await check("post and comment mutations update the visible UI without stale background overwrites", async () => {
  const feed = await read("src/components/FeedClient.tsx");
  const toast = await read("src/components/Toast.tsx");
  assert.match(feed, /setPosts\(old => old\.map\(post => post\.id === editingPost\.id/);
  assert.match(feed, /setPosts\(old => old\.filter\(item => item\.id !== post\.id\)\)/);
  assert.match(feed, /setComments\(old => \(\{[\s\S]*?item\.id === comment\.id/);
  assert.doesNotMatch(feed, /setSuccess\("اتحذف المنشور\."\);[\s\S]{0,180}void load\(\)/);
  assert.doesNotMatch(feed, /setSuccess\("اتحفظ تعديل المنشور\."\);[\s\S]{0,180}void load\(\)/);
  assert.match(toast, /createPortal/);
  assert.match(toast, /document\.body/);
});
await check("unread notification count is per-user and appears in the app header", async () => {
  const route = await read("src/app/api/notifications/unread-count/route.ts");
  const header = await read("src/components/AppHeader.tsx");
  const styles = await read("src/app/globals.css");
  assert.match(route, /getApiUser\(\{ verified: true \}\)/);
  assert.match(route, /WHERE user_id=\$1 AND is_read=false/);
  assert.match(header, /api\/notifications\/unread-count/);
  assert.match(header, /notification-count-badge/);
  assert.match(header, /setInterval/);
  assert.match(styles, /\.notification-count-badge/);
  assert.match(await read("src/components/NotificationsClient.tsx"), /setInterval/);
});
await check("PWA installation guidance is reachable on the landing hero and documents iPhone Share actions", async () => {
  const home = await read("src/app/page.tsx");
  const install = await read("src/components/PWAInstallButton.tsx");
  const provider = await read("src/components/PWAProvider.tsx");
  assert.match(home, /landing-hero-actions[\s\S]*<PWAInstallButton/);
  assert.match(install, /إضافة إلى الشاشة الرئيسية/);
  assert.match(install, /تعديل الإجراءات/);
  assert.match(provider, /beforeinstallprompt/);
});

await check("public privacy, terms, and community-guideline pages are linked across the platform", async () => {
  for (const file of ["src/app/privacy/page.tsx", "src/app/terms/page.tsx", "src/app/community-guidelines/page.tsx", "src/components/LegalPage.tsx"]) assert.equal(await exists(file), true, `${file} missing`);
  const landing = await read("src/app/page.tsx");
  const shell = await read("src/components/AppShell.tsx");
  const privacy = await read("src/app/privacy/page.tsx");
  const terms = await read("src/app/terms/page.tsx");
  const guidelines = await read("src/app/community-guidelines/page.tsx");
  assert.match(landing, /href="\/privacy"/);
  assert.match(shell, /href="\/terms"/);
  assert.match(privacy, /مستندات التحقق/);
  assert.match(terms, /مسؤولية المحتوى/);
  assert.match(guidelines, /سرية المشروعات والعملاء/);
});


await check("authenticated users never see the welcome page again until logout", async () => {
  const home = await read("src/app/page.tsx");
  const brand = await read("src/components/Brand.tsx");
  const header = await read("src/components/AppHeader.tsx");
  assert.match(home, /if \(user\) redirect\(/);
  assert.match(header, /<Brand href="\/feed" \/>/);
  assert.match(brand, /href=\{href \|\| \(admin \? "\/admin" : "\/"\)\}/);
});
await check("login remember-me controls whether the session cookie persists", async () => {
  const form = await read("src/components/AuthForm.tsx");
  const login = await read("src/app/api/auth/login/route.ts");
  const auth = await read("src/lib/auth.ts");
  assert.match(form, /تذكرني على هذا الجهاز/);
  assert.match(form, /rememberMe: e\.target\.checked/);
  assert.match(login, /body\.rememberMe === true/);
  assert.match(login, /createSession\(user\.id, rememberMe\)/);
  assert.match(auth, /rememberMe \? \`\$\{REMEMBER_SESSION_DAYS\} days\` : \`\$\{BROWSER_SESSION_HOURS\} hours\`/);
  assert.match(auth, /rememberMe \? \{ maxAge:/);
  assert.doesNotMatch(auth, /maxAge: REMEMBER_SESSION_DAYS[^,]*,\s*\}\);/);
});
await check("the central mobile action opens and focuses the feed composer", async () => {
  const shell = await read("src/components/AppShell.tsx");
  const action = await read("src/components/MobileCreatePostButton.tsx");
  const feed = await read("src/components/FeedClient.tsx");
  assert.match(shell, /<MobileCreatePostButton\/>/);
  assert.match(action, /axis-open-composer/);
  assert.match(action, /router\.push\("\/feed\?compose=1"\)/);
  assert.match(feed, /window\.addEventListener\("axis-open-composer"/);
  assert.match(feed, /getElementById\("feed-post-body"\)\?\.focus/);
});
await check("the feed no longer fetches or displays events/news widgets", async () => {
  const feed = await read("src/components/FeedClient.tsx");
  const shell = await read("src/components/AppShell.tsx");
  assert.doesNotMatch(feed, /fetch\("\/api\/events"/);
  assert.doesNotMatch(feed, /feed-event-strip|فعاليات وأخبار/);
  assert.doesNotMatch(shell, /فعاليات وأخبار|EngineeringEvent/);
});
await check("all Arabic-locale number formatting forces Latin digits and numeral literals are Western", async () => {
  const { readdir } = await import("node:fs/promises");
  const scan = async dir => {
    const out = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...await scan(full));
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push([full, await readFile(full, "utf8")]);
    }
    return out;
  };
  const sources = await scan(path.join(root, "src"));
  const arabicDigits = /[٠-٩]/u;
  for (const [file, source] of sources) {
    assert.doesNotMatch(source, arabicDigits, `Arabic-Indic digits remain in ${file}`);
    assert.doesNotMatch(source, /toLocale(?:String|DateString|TimeString)\(['"]ar-EG['"]/, `Arabic locale formatting lacks Latin-digit extension in ${file}`);
    assert.doesNotMatch(source, /u-nu-latn-u-nu-latn/, `Duplicated Unicode number-format extension found in ${file}`);
  }
});

await check("profile camera icon import exists whenever profile media controls use Camera", async () => {
  const profile = await read("src/components/ProfileClient.tsx");
  assert.match(profile, /\bCamera\b/);
  assert.match(profile, /import \{[\s\S]*?\bCamera\b[\s\S]*?\} from "lucide-react"/);
});

await check("same-origin mutation guard supports stable Vercel aliases and safe Referer fallback", async () => {
  const http = await read("src/lib/http.ts");
  assert.match(http, /x-forwarded-host/);
  assert.match(http, /APP_URL/);
  assert.match(http, /trustedOrigins\.has\(new URL\(referer\)\.origin\.toLowerCase\(\)\)/);
  assert.doesNotMatch(http, /if \(!origin\) return false/);
  const mutation = await read("src/app/api/posts/[postId]/route.ts");
  assert.match(mutation, /export async function PATCH/);
  assert.match(mutation, /export async function DELETE/);
  assert.match(mutation, /sameOrigin\(request\)/);
});

await check("post pinning is limited to one pinned post per personal profile or group", async () => {
  const pin = await read("src/app/api/posts/[postId]/pin/route.ts");
  const schema = await read("db/schema.sql");
  const migration = await read("db/migrations/20261025_post_pinning.sql");
  const feedRoute = await read("src/app/api/feed/route.ts");
  const groupRoute = await read("src/app/api/groups/[groupId]/posts/route.ts");
  const feed = await read("src/components/FeedClient.tsx");
  const profile = await read("src/components/ProfileClient.tsx");
  const groupClient = await read("src/components/GroupDetailClient.tsx");
  assert.match(pin, /getApiUser\(\{ verified: true \}\)/);
  assert.match(pin, /group_owner_id !== user!\.id/);
  assert.match(pin, /UPDATE posts SET pinned_at=NULL/);
  assert.match(schema, /ADD COLUMN IF NOT EXISTS pinned_at timestamptz/);
  assert.match(migration, /posts_one_pinned_personal_per_author_idx/);
  assert.match(migration, /posts_one_pinned_group_idx/);
  assert.match(feedRoute, /p\.group_id,p\.pinned_at/);
  assert.match(groupRoute, /p\.pinned_at DESC NULLS LAST/);
  assert.match(feed, /togglePinPost/);
  assert.match(profile, /toggleProfilePin/);
  assert.match(groupClient, /togglePinGroupPost/);
});

await check("authors can still edit or delete their group posts after leaving the group", async () => {
  const route = await read("src/app/api/posts/[postId]/route.ts");
  assert.match(route, /post\.group_id && post\.author_id !== userId/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /export async function DELETE/);
});

await check("mobile same-origin fallback accepts browser Fetch Metadata only when the request is same-origin", async () => {
  const http = await read("src/lib/http.ts");
  assert.match(http, /sec-fetch-site/);
  assert.match(http, /=== "same-origin"/);
  assert.match(http, /trustedOrigins\.has\(new URL\(request\.url\)\.origin\.toLowerCase\(\)\)/);
});

await check("admin can pin one announcement at the top of the main feed, and long posts offer read-more", async () => {
  const pinRoute = await read("src/app/api/posts/[postId]/main-pin/route.ts");
  const feedRoute = await read("src/app/api/feed/route.ts");
  const feed = await read("src/components/FeedClient.tsx");
  const types = await read("src/lib/types.ts");
  const migration = await read("db/migrations/20261025_main_feed_pin.sql");
  assert.match(pinRoute, /user!\.role !== "admin"/);
  assert.match(pinRoute, /main_feed_pinned_at/);
  assert.match(feedRoute, /p\.main_feed_pinned_at/);
  assert.match(feedRoute, /ORDER BY p\.main_feed_pinned_at DESC NULLS LAST, p\.created_at DESC/);
  assert.match(feed, /تثبيت في الرئيسية/);
  assert.match(feed, /عرض المزيد/);
  assert.match(feed, /POST_PREVIEW_WORD_LIMIT = 20/);
  assert.match(feed, /user\.role === "admin" && !post\.group_id/);
  assert.match(feed, /post\.author_id !== user\.id && !\["admin", "moderator"\]\.includes\(user\.role\)/);
  assert.match(types, /main_feed_pinned_at\?: string \| null/);
  assert.match(migration, /posts_single_main_feed_pin_idx/);
});

console.log(`AXIS static smoke checks: ${checks.length} passed`);
for (const name of checks) console.log(`✓ ${name}`);
