import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cleanText, getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { SPECIALTIES } from "@/lib/constants";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ postId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function PATCH(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  const { postId } = await context.params;
  if (!UUID.test(postId)) return jsonError("المنشور غير صالح.", 400);
  let input: Record<string, unknown>; try { input = await request.json(); } catch { return jsonError("بيانات المنشور غير صالحة."); }
  const body = cleanText(input.body, 5000);
  const specialty = cleanText(input.specialty, 80);
  if (specialty && !(SPECIALTIES as readonly string[]).includes(specialty)) return jsonError("التخصص المحدد غير صالح.");
  const existing = await query<{ author_id: string; image_data: Buffer | null; shared_post_id: string | null; group_id: string | null }>(
    "SELECT author_id,image_data,shared_post_id,group_id FROM posts WHERE id=$1", [postId]);
  const post = existing.rows[0]; if (!post) return jsonError("المنشور غير موجود.", 404);
  if (post.author_id !== user!.id && !["admin","moderator"].includes(user!.role)) return jsonError("تقدر تعدّل منشوراتك أنت بس.", 403);
  if (!body && !post.image_data && !post.shared_post_id) return jsonError("اكتب محتوى للمنشور قبل الحفظ.");
  if (post.group_id) {
    const access = await query("SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2 AND status='active'", [post.group_id,user!.id]);
    if (!access.rows.length && post.author_id === user!.id) return jsonError("لازم تكون عضوًا نشطًا في المجموعة لتعديل المشاركة.", 403);
  }
  const result = await query(`UPDATE posts SET body=$1,specialty=$2,updated_at=now() WHERE id=$3
    RETURNING id,body,specialty,updated_at`, [body,specialty||null,postId]);
  return NextResponse.json({ ok: true, post: result.rows[0] });
}

export async function DELETE(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  const { postId } = await context.params;
  if (!UUID.test(postId)) return jsonError("المنشور غير صالح.", 400);
  const result = await query("DELETE FROM posts WHERE id=$1 AND (author_id=$2 OR $3 IN ('admin','moderator')) RETURNING id", [postId, user!.id, user!.role]);
  if (!result.rows.length) return jsonError("المنشور غير موجود أو لا تملك صلاحية حذفه.", 404);
  return NextResponse.json({ ok: true });
}
