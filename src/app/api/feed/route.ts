import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, cleanText, jsonError, sameOrigin } from "@/lib/http";
import { parseSafeUpload } from "@/lib/upload";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";
import { SPECIALTIES } from "@/lib/constants";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await getApiUser(); if (response) return response;
  const canViewVerifiedContent = user!.verification_status === "verified" || ["admin", "reviewer", "moderator"].includes(user!.role);
  const url = new URL(request.url);
  const specialty = cleanText(url.searchParams.get("specialty"), 80);
  const q = cleanText(url.searchParams.get("q"), 140);
  const sharedPostId = cleanText(url.searchParams.get("post"), 36);
  const followingOnly = canViewVerifiedContent && url.searchParams.get("following") === "1";
  const sortParam = url.searchParams.get("sort");
  const sortBy = sortParam === "engagement" || sortParam === "discussion" ? sortParam : "latest";
  const offsetValue = Number.parseInt(url.searchParams.get("offset") || "0", 10);
  const offset = Number.isFinite(offsetValue) ? Math.min(10000, Math.max(0, offsetValue)) : 0;
  const beforeRaw = url.searchParams.get("before");
  const before = beforeRaw && !Number.isNaN(Date.parse(beforeRaw)) ? new Date(beforeRaw).toISOString() : null;
  if (sharedPostId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sharedPostId)) return jsonError("رابط المنشور غير صالح.", 400);
  try {
    if (sharedPostId && !canViewVerifiedContent) {
      const restricted = await query<{ id: string }>(
        `SELECT p.id FROM posts p JOIN users u ON u.id=p.author_id
          WHERE p.id=$1 AND u.account_status='active' AND u.verification_status='verified'
            AND (p.access_level='verified' OR p.group_id IS NOT NULL) LIMIT 1`,
        [sharedPostId],
      );
      if (restricted.rows[0]) return jsonError("المنشور ده للمهندسين الموثقين. وثّق عضويتك لعرضه.", 403);
    }
    const result = await query(`SELECT p.id,p.author_id,u.username,u.display_name,u.role AS author_role,u.seniority_code,u.job_title,u.specialty AS profile_specialty,
      u.verified_badges,u.avatar_color,(u.avatar_image_mime IS NOT NULL) AS has_avatar,p.body,p.specialty,p.access_level,p.image_data IS NOT NULL AS has_image,p.image_mime,p.created_at,p.shared_post_id,p.group_id,p.pinned_at,p.main_feed_pinned_at,p.main_feed_pinned_by,
      sp.body AS shared_body,sp.author_id AS shared_author_id,sp.specialty AS shared_specialty,sp.created_at AS shared_created_at,
      sp.image_data IS NOT NULL AS shared_has_image,sp.image_mime AS shared_image_mime,
      su.username AS shared_username,su.display_name AS shared_display_name,su.role AS shared_author_role,
      su.seniority_code AS shared_seniority_code,su.job_title AS shared_job_title,
      su.specialty AS shared_profile_specialty,su.verified_badges AS shared_verified_badges,su.avatar_color AS shared_avatar_color,(su.avatar_image_mime IS NOT NULL) AS shared_has_avatar,
      COALESCE(like_stats.like_count,0)::int AS like_count,
      COALESCE(comment_stats.comment_count,0)::int AS comment_count,
      COALESCE(share_stats.share_count,0)::int AS share_count,
      ((COALESCE(like_stats.like_count,0)::numeric
        + COALESCE(comment_stats.comment_count,0)::numeric * 2.5
        + COALESCE(share_stats.share_count,0)::numeric * 3)
        / POWER(1 + GREATEST(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600, 0) / 18.0, 0.7)
      )::numeric(12,3) AS engagement_score,
      EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id=p.id AND l.user_id=$1) AS has_liked
      FROM posts p JOIN users u ON u.id=p.author_id
      LEFT JOIN posts sp ON sp.id=p.shared_post_id
      LEFT JOIN users su ON su.id=sp.author_id
      LEFT JOIN LATERAL (SELECT count(*)::int AS like_count FROM post_likes l WHERE l.post_id=p.id) like_stats ON TRUE
      LEFT JOIN LATERAL (SELECT count(*)::int AS comment_count FROM comments c WHERE c.post_id=p.id) comment_stats ON TRUE
      LEFT JOIN LATERAL (SELECT count(*)::int AS share_count FROM posts shares WHERE shares.shared_post_id=p.id AND shares.group_id IS NULL) share_stats ON TRUE
      WHERE u.verification_status='verified' AND u.account_status='active'
        AND (p.access_level='members' OR $7::boolean)
        AND (p.group_id IS NULL OR ($7::boolean AND $4::uuid IS NOT NULL AND EXISTS(SELECT 1 FROM engineering_groups pg WHERE pg.id=p.group_id AND (pg.visibility='public' OR EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id=pg.id AND gm.user_id=$1 AND gm.status='active')))))
        AND (p.shared_post_id IS NULL OR (su.verification_status='verified' AND su.account_status='active' AND sp.group_id IS NULL AND (sp.access_level='members' OR $7::boolean)))
        AND ($2 = '' OR p.specialty=$2 OR (p.specialty IS NULL AND u.specialty=$2))
        AND ($3 = '' OR p.body ILIKE '%'||$3||'%' OR u.display_name ILIKE '%'||$3||'%' OR u.username ILIKE '%'||$3||'%'
             OR sp.body ILIKE '%'||$3||'%' OR su.display_name ILIKE '%'||$3||'%' OR su.username ILIKE '%'||$3||'%')
        AND ($4::uuid IS NULL OR p.id=$4::uuid)
        AND (NOT $5::boolean OR EXISTS(SELECT 1 FROM user_follows f WHERE f.follower_id=$1 AND f.following_id=p.author_id))
        AND ($8::text <> 'latest' OR $6::timestamptz IS NULL OR (p.main_feed_pinned_at IS NULL AND p.created_at < $6::timestamptz))
      ORDER BY p.main_feed_pinned_at DESC NULLS LAST,
        CASE WHEN $8::text = 'engagement' THEN
          ((COALESCE(like_stats.like_count,0)::numeric
            + COALESCE(comment_stats.comment_count,0)::numeric * 2.5
            + COALESCE(share_stats.share_count,0)::numeric * 3)
            / POWER(1 + GREATEST(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600, 0) / 18.0, 0.7))
          ELSE NULL END DESC NULLS LAST,
        CASE WHEN $8::text = 'discussion' THEN COALESCE(comment_stats.comment_count,0) ELSE NULL END DESC NULLS LAST,
        p.created_at DESC, p.id DESC
      LIMIT 31 OFFSET $9`, [user!.id, specialty, q, sharedPostId || null, followingOnly, before, canViewVerifiedContent, sortBy, offset]);
    const hasMore = result.rows.length > 30;
    const pageRows = hasMore ? result.rows.slice(0,30) : result.rows;
    const nextCursor = hasMore && pageRows.length ? new Date(pageRows[pageRows.length-1].created_at as string).toISOString() : null;
    const posts = pageRows.map((row: Record<string, unknown>) => ({
      ...row,
      specialty: row.specialty || row.profile_specialty,
      shared_specialty: row.shared_specialty || row.shared_profile_specialty,
      profile_specialty: undefined,
      shared_profile_specialty: undefined,
    }));
    let lockedPostCount = 0;
    if (!canViewVerifiedContent && !q && !specialty && !sharedPostId && !followingOnly && !before) {
      const locked = await query<{ locked_count: number }>(
        `SELECT LEAST(3, COUNT(*)::int) AS locked_count
           FROM posts p JOIN users u ON u.id=p.author_id
          WHERE p.access_level='verified' AND p.group_id IS NULL AND p.shared_post_id IS NULL
            AND u.verification_status='verified' AND u.account_status='active'`,
      );
      lockedPostCount = Number(locked.rows[0]?.locked_count || 0);
    }
    return NextResponse.json({ posts, hasMore, nextCursor, lockedPostCount });
  } catch (error) { console.error("AXIS feed error", (error as { code?: string })?.code || "database_error"); return jsonError("مش قادرين نحمّل المشاركات دلوقتي. جرّب تاني بعد شوية.", 500); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  let form: FormData; try { form = await request.formData(); } catch { return jsonError("بيانات المنشور غير صالحة."); }
  const body = cleanText(form.get("body"), 5000); const specialty = cleanText(form.get("specialty"), 80);
  const accessLevelRaw = cleanText(form.get("accessLevel"), 16);
  if (accessLevelRaw && !["verified", "members"].includes(accessLevelRaw)) return jsonError("اختيار جمهور المنشور غير صالح.");
  const accessLevel = accessLevelRaw || "verified";
  if (await consumeRateLimit("create-post", `${requestIpKey(request)}:${user!.id}`, { limit: 20, windowMinutes: 10, blockMinutes: 10 })) return jsonError("نشرت مشاركات كتير في وقت قصير. استنى شوية قبل ما تنشر تاني.", 429);
  const fileRaw = form.get("image");
  if (specialty && !(SPECIALTIES as readonly string[]).includes(specialty)) return jsonError("التخصص المحدد غير صالح.");
  let image: Awaited<ReturnType<typeof parseSafeUpload>> = null;
  try { image = await parseSafeUpload(fileRaw, { allowPdf: false, maxBytes: 2_000_000 }); }
  catch (error) { return jsonError(error instanceof Error ? error.message : "الصورة غير صالحة."); }
  if (!body && !image) return jsonError("اكتب حاجة تحب تشاركها، أو أرفق صورة.");
  if (body.length > 5000) return jsonError("المنشور أطول من الحد المسموح.");
  try {
    const result = await query<{ id: string }>(`INSERT INTO posts(author_id,body,specialty,image_data,image_mime,image_name,access_level)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [user!.id, body, specialty || user!.specialty || null, image?.buffer || null, image?.mime || null, image?.name || null, accessLevel]);
    return NextResponse.json({ ok: true, postId: result.rows[0].id }, { status: 201 });
  } catch (error) { console.error("AXIS post create error", (error as { code?: string })?.code || "database_error"); return jsonError("ما قدرناش ننشر المشاركة دلوقتي. جرّب تاني.", 500); }
}
