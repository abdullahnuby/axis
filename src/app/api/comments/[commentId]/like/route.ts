import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ commentId: string }> };

export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const { commentId } = await context.params;
  try {
    const liked = await withTransaction(async client => {
      const comment = await client.query<{ author_id: string; post_id: string }>(
        `SELECT c.author_id,c.post_id FROM comments c
         JOIN posts p ON p.id=c.post_id JOIN users author ON author.id=p.author_id
         WHERE c.id=$1 AND author.verification_status='verified' AND author.account_status='active'`,
        [commentId],
      );
      if (!comment.rows[0]) throw Object.assign(new Error("التعليق غير موجود."), { statusCode: 404 });
      const inserted = await client.query(
        "INSERT INTO comment_likes(comment_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING comment_id",
        [commentId, user!.id],
      );
      if (inserted.rows.length) return true;
      await client.query("DELETE FROM comment_likes WHERE comment_id=$1 AND user_id=$2", [commentId, user!.id]);
      return false;
    });
    const counts = await query<{ count: number; has_liked: boolean }>(
      `SELECT COUNT(*)::int AS count,
              EXISTS(SELECT 1 FROM comment_likes WHERE comment_id=$1 AND user_id=$2) AS has_liked
         FROM comment_likes WHERE comment_id=$1`,
      [commentId, user!.id],
    );
    return NextResponse.json({ liked, likeCount: counts.rows[0]?.count || 0, hasLiked: counts.rows[0]?.has_liked || false });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode;
    console.error("AXIS comment like error", (error as { code?: string })?.code || "request_error");
    return jsonError(error instanceof Error ? error.message : "ما قدرناش نحدّث الإعجاب. جرّب تاني.", status || 500);
  }
}
