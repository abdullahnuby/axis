import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { cleanText, getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ commentId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type CommentAccess = { id: string; post_id: string; author_id: string; group_id: string | null; visibility: "public" | "closed" | null };

async function getCommentForAction(commentId: string, userId: string, lock = false): Promise<CommentAccess | null> {
  const result = await query<CommentAccess>(
    `SELECT c.id, c.post_id, c.author_id, p.group_id, g.visibility
       FROM comments c
       JOIN posts p ON p.id = c.post_id
       LEFT JOIN engineering_groups g ON g.id = p.group_id
      WHERE c.id = $1
      ${lock ? "FOR UPDATE OF c" : ""}`,
    [commentId],
  );
  const row = result.rows[0] || null;
  if (!row?.group_id || row.visibility === "public") return row;
  const membership = await query(
    "SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2 AND status='active'",
    [row.group_id, userId],
  );
  return membership.rows.length ? row : null;
}

export async function PATCH(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const { commentId } = await context.params;
  if (!UUID.test(commentId)) return jsonError("التعليق غير صالح.", 400);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return jsonError("بيانات التعليق غير صالحة."); }
  const body = cleanText(input.body, 1200);
  if (!body) return jsonError("اكتب التعليق قبل الحفظ.");
  if (await consumeRateLimit("edit-comment", `${requestIpKey(request)}:${user!.id}`, { limit: 30, windowMinutes: 10, blockMinutes: 10 })) {
    return jsonError("تعديلات كتير في وقت قصير. جرّب بعد شوية.", 429);
  }
  try {
    const comment = await getCommentForAction(commentId, user!.id);
    if (!comment) return jsonError("التعليق غير موجود أو لم يعد متاحًا لك.", 404);
    if (comment.author_id !== user!.id && !["admin", "moderator"].includes(user!.role)) return jsonError("تقدر تعدّل تعليقاتك أنت بس.", 403);
    const updated = await query<{ id: string; body: string; edited_at: string }>(
      `UPDATE comments SET body=$1, edited_at=now() WHERE id=$2
       RETURNING id, body, edited_at`,
      [body, commentId],
    );
    if (!updated.rows[0]) return jsonError("التعليق مش موجود أو اتحذف.", 404);
    return NextResponse.json({ ok: true, comment: updated.rows[0] });
  } catch (error) {
    console.error("AXIS comment update error", (error as { code?: string })?.code || "database_error");
    return jsonError("ما قدرناش نحفظ تعديل التعليق دلوقتي. جرّب تاني.", 500);
  }
}

export async function DELETE(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const { commentId } = await context.params;
  if (!UUID.test(commentId)) return jsonError("التعليق غير صالح.", 400);
  if (await consumeRateLimit("delete-comment", `${requestIpKey(request)}:${user!.id}`, { limit: 30, windowMinutes: 10, blockMinutes: 10 })) return jsonError("عمليات حذف التعليقات كتير في وقت قصير. جرّب بعد شوية.", 429);
  try {
    const removedCount = await withTransaction(async client => {
      const found = await client.query<CommentAccess>(
        `SELECT c.id,c.post_id,c.author_id,p.group_id,g.visibility
           FROM comments c JOIN posts p ON p.id=c.post_id
           LEFT JOIN engineering_groups g ON g.id=p.group_id
          WHERE c.id=$1 FOR UPDATE OF c`,
        [commentId],
      );
      const comment = found.rows[0];
      if (!comment) throw Object.assign(new Error("التعليق مش موجود أو اتحذف بالفعل."), { statusCode: 404 });
      if (comment.author_id !== user!.id && !["admin", "moderator"].includes(user!.role)) throw Object.assign(new Error("تقدر تحذف تعليقاتك أنت بس."), { statusCode: 403 });
      if (comment.group_id && comment.visibility !== "public") {
        const member = await client.query("SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2 AND status='active'", [comment.group_id, user!.id]);
        if (!member.rows.length) throw Object.assign(new Error("التعليق غير متاح لك."), { statusCode: 404 });
      }
      const descendants = await client.query<{ count: number }>(
        `WITH RECURSIVE subtree(id) AS (
           SELECT id FROM comments WHERE id=$1
           UNION ALL
           SELECT child.id FROM comments child JOIN subtree parent ON child.parent_comment_id=parent.id
         ) SELECT count(*)::int AS count FROM subtree`,
        [commentId],
      );
      await client.query("DELETE FROM comments WHERE id=$1", [commentId]);
      return Number(descendants.rows[0]?.count || 1);
    });
    return NextResponse.json({ ok: true, removedCount });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode;
    console.error("AXIS comment delete error", (error as { code?: string })?.code || "request_error");
    return jsonError(error instanceof Error ? error.message : "ما قدرناش نحذف التعليق دلوقتي. جرّب تاني.", status || 500);
  }
}
