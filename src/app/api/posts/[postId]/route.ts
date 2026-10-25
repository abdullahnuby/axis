import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { cleanText, getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";
import { SPECIALTIES } from "@/lib/constants";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ postId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ExistingPost = { author_id: string; image_data: Buffer | null; shared_post_id: string | null; group_id: string | null };

async function loadAccessiblePost(postId: string, userId: string, role: string) {
  const existing = await query<ExistingPost>("SELECT author_id,image_data,shared_post_id,group_id FROM posts WHERE id=$1", [postId]);
  const post = existing.rows[0];
  if (!post) return null;
  // Let authors manage their own group posts even after leaving that group.
  // Non-authors still need active membership unless they are moderators/admins.
  if (post.group_id && post.author_id !== userId && !["admin", "moderator"].includes(role)) {
    const access = await query("SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2 AND status='active'", [post.group_id, userId]);
    if (!access.rows.length) return null;
  }
  return post;
}

export async function PATCH(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const { postId } = await context.params;
  if (!UUID.test(postId)) return jsonError("المنشور غير صالح.", 400);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return jsonError("بيانات المنشور غير صالحة."); }
  const body = cleanText(input.body, 5000);
  const specialty = cleanText(input.specialty, 80);
  if (specialty && !(SPECIALTIES as readonly string[]).includes(specialty)) return jsonError("التخصص المحدد غير صالح.");
  if (await consumeRateLimit("edit-post", `${requestIpKey(request)}:${user!.id}`, { limit: 30, windowMinutes: 10, blockMinutes: 10 })) return jsonError("تعديلات كتير في وقت قصير. جرّب بعد شوية.", 429);
  try {
    const post = await loadAccessiblePost(postId, user!.id, user!.role);
    if (!post) return jsonError("المنشور غير موجود أو مش متاح لحسابك.", 404);
    if (post.author_id !== user!.id && !["admin", "moderator"].includes(user!.role)) return jsonError("تقدر تعدّل منشوراتك أنت بس.", 403);
    if (!body && !post.image_data && !post.shared_post_id) return jsonError("اكتب محتوى للمنشور قبل الحفظ.");
    const result = await query(`UPDATE posts SET body=$1,specialty=$2,updated_at=now() WHERE id=$3
      RETURNING id,body,specialty,updated_at`, [body, specialty || null, postId]);
    if (!result.rows[0]) return jsonError("المنشور مش موجود أو اتحذف.", 404);
    return NextResponse.json({ ok: true, post: result.rows[0] });
  } catch (error) {
    console.error("AXIS post update error", (error as { code?: string })?.code || "database_error");
    return jsonError("ما قدرناش نحفظ تعديل المنشور دلوقتي. جرّب تاني.", 500);
  }
}

export async function DELETE(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const { postId } = await context.params;
  if (!UUID.test(postId)) return jsonError("المنشور غير صالح.", 400);
  if (await consumeRateLimit("delete-post", `${requestIpKey(request)}:${user!.id}`, { limit: 15, windowMinutes: 10, blockMinutes: 10 })) return jsonError("عمليات الحذف كتير في وقت قصير. جرّب بعد شوية.", 429);
  try {
    const post = await loadAccessiblePost(postId, user!.id, user!.role);
    if (!post) return jsonError("المنشور غير موجود أو مش متاح لحسابك.", 404);
    if (post.author_id !== user!.id && !["admin", "moderator"].includes(user!.role)) return jsonError("تقدر تحذف منشوراتك أنت بس.", 403);
    const deletedId = await withTransaction(async client => {
      const locked = await client.query<{ id: string }>("SELECT id FROM posts WHERE id=$1 FOR UPDATE", [postId]);
      if (!locked.rows[0]) return null;
      // Preserve other people's reposts: detach them from the source before deleting it.
      // The note stays in the repost body, rather than letting ON DELETE CASCADE erase their posts.
      await client.query(
        `UPDATE posts SET body = CASE WHEN length(btrim(body)) > 0
          THEN body || E'\n\nالمنشور الأصلي لم يعد متاحًا.'
          ELSE 'المنشور الأصلي لم يعد متاحًا.' END,
          shared_post_id = NULL, updated_at = now()
         WHERE shared_post_id = $1`,
        [postId],
      );
      const result = await client.query("DELETE FROM posts WHERE id=$1 RETURNING id", [postId]);
      return result.rows[0]?.id || null;
    });
    if (!deletedId) return jsonError("المنشور مش موجود أو اتحذف بالفعل.", 404);
    return NextResponse.json({ ok: true, id: deletedId });
  } catch (error) {
    console.error("AXIS post delete error", (error as { code?: string })?.code || "database_error");
    return jsonError("ما قدرناش نحذف المنشور دلوقتي. جرّب تاني.", 500);
  }
}
