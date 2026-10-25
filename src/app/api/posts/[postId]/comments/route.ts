import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { getApiUser, cleanText, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ postId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: Ctx) {
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const { postId } = await context.params;
  try {
    const visible = await query(
      `SELECT p.id FROM posts p JOIN users u ON u.id=p.author_id LEFT JOIN engineering_groups g ON g.id=p.group_id
       WHERE p.id=$1 AND u.verification_status='verified' AND u.account_status='active'
         AND (p.group_id IS NULL OR g.visibility='public' OR EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id=p.group_id AND gm.user_id=$2 AND gm.status='active'))`,
      [postId,user!.id],
    );
    if (!visible.rows[0]) return jsonError("المنشور غير موجود.", 404);
    const result = await query(
      `SELECT c.id,c.post_id,c.author_id,c.parent_comment_id,u.display_name,u.username,u.role AS author_role,
              u.avatar_color,u.seniority_code,u.verified_badges,c.body,c.created_at,c.edited_at,
              COUNT(cl.user_id)::int AS like_count,
              EXISTS(SELECT 1 FROM comment_likes mine WHERE mine.comment_id=c.id AND mine.user_id=$2) AS has_liked
         FROM comments c
         JOIN users u ON u.id=c.author_id
         LEFT JOIN comment_likes cl ON cl.comment_id=c.id
        WHERE c.post_id=$1 AND u.verification_status='verified' AND u.account_status='active'
        GROUP BY c.id,u.id
        ORDER BY c.created_at ASC
        LIMIT 250`,
      [postId, user!.id],
    );
    return NextResponse.json({ comments: result.rows });
  } catch (error) {
    console.error("AXIS comments load error", (error as { code?: string })?.code || "database_error");
    return jsonError("التعليقات مش متاحة دلوقتي. جرّب تاني بعد شوية.", 500);
  }
}

export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const { postId } = await context.params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError("التعليق غير صالح."); }
  const text = cleanText(body.body, 1200);
  const parentCommentId = typeof body.parentCommentId === "string" ? body.parentCommentId.trim() : "";
  if (!text) return jsonError("اكتب تعليقك الأول.");
  if (await consumeRateLimit("create-comment", `${requestIpKey(request)}:${user!.id}`, { limit: 30, windowMinutes: 10, blockMinutes: 10 })) return jsonError("التعليقات كتير في وقت قصير. جرّب بعد شوية.", 429);
  if (parentCommentId && !UUID.test(parentCommentId)) return jsonError("التعليق المراد الرد عليه غير صالح.");
  try {
    const comment = await withTransaction(async client => {
      const post = await client.query<{ author_id: string }>(
        `SELECT p.author_id FROM posts p JOIN users u ON u.id=p.author_id LEFT JOIN engineering_groups g ON g.id=p.group_id
         WHERE p.id=$1 AND u.verification_status='verified' AND u.account_status='active'
           AND (p.group_id IS NULL OR g.visibility='public' OR EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id=p.group_id AND gm.user_id=$2 AND gm.status='active'))`,
        [postId,user!.id],
      );
      if (!post.rows[0]) throw Object.assign(new Error("المنشور غير موجود."), { statusCode: 404 });
      if (parentCommentId) {
        const parent = await client.query<{ id: string }>("SELECT id FROM comments WHERE id=$1 AND post_id=$2", [parentCommentId, postId]);
        if (!parent.rows[0]) throw Object.assign(new Error("التعليق الذي تريد الرد عليه غير موجود."), { statusCode: 404 });
      }
      const result = await client.query(
        `INSERT INTO comments(post_id,author_id,parent_comment_id,body)
         VALUES($1,$2,$3,$4)
         RETURNING id,post_id,author_id,parent_comment_id,body,created_at`,
        [postId, user!.id, parentCommentId || null, text],
      );
      const recipientId = parentCommentId
        ? (await client.query<{ author_id: string }>("SELECT author_id FROM comments WHERE id=$1", [parentCommentId])).rows[0]?.author_id
        : post.rows[0].author_id;
      if (recipientId && recipientId !== user!.id) {
        const message = parentCommentId
          ? `${user!.display_name} رد على تعليقك.`
          : `${user!.display_name} علّق على منشورك.`;
        await client.query(
          "INSERT INTO notifications(user_id,actor_id,kind,message,target_post_id,target_comment_id) VALUES($1,$2,'comment',$3,$4,$5)",
          [recipientId, user!.id, message, postId, result.rows[0].id],
        );
      }
      return result.rows[0];
    });
    return NextResponse.json({ comment: {
      ...comment,
      display_name: user!.display_name,
      username: user!.username,
      author_role: user!.role,
      avatar_color: user!.avatar_color,
      seniority_code: user!.seniority_code,
      verified_badges: user!.verified_badges,
      like_count: 0,
      has_liked: false,
    } }, { status: 201 });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode;
    console.error("AXIS comment create error", (error as { code?: string })?.code || "request_error");
    return jsonError(error instanceof Error ? error.message : "ما قدرناش نبعت تعليقك. جرّب تاني.", status || 500);
  }
}
