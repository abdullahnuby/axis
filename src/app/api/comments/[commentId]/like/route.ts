import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ commentId: string }> };

export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const { commentId } = await context.params;
  if (await consumeRateLimit("like-comment", `${requestIpKey(request)}:${user!.id}`, { limit: 160, windowMinutes: 10, blockMinutes: 5 })) {
    return jsonError("التفاعل سريع جدًا. استنى شوية.", 429);
  }

  let pushRecipient: string | null = null;
  try {
    const liked = await withTransaction(async client => {
      const comment = await client.query<{ author_id: string; post_id: string }>(
        `SELECT c.author_id,c.post_id FROM comments c
         JOIN posts p ON p.id=c.post_id
         JOIN users author ON author.id=p.author_id
         LEFT JOIN engineering_groups g ON g.id=p.group_id
         WHERE c.id=$1 AND author.verification_status='verified' AND author.account_status='active'
           AND (p.group_id IS NULL OR g.visibility='public'
             OR EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id=p.group_id AND gm.user_id=$2 AND gm.status='active'))`,
        [commentId, user!.id],
      );
      if (!comment.rows[0]) throw Object.assign(new Error("التعليق غير موجود."), { statusCode: 404 });
      const inserted = await client.query(
        "INSERT INTO comment_likes(comment_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING comment_id",
        [commentId, user!.id],
      );
      if (inserted.rows.length) {
        if (comment.rows[0].author_id !== user!.id) {
          pushRecipient = comment.rows[0].author_id;
          await client.query(
            "INSERT INTO notifications(user_id,actor_id,kind,message,target_post_id,target_comment_id) VALUES($1,$2,'like',$3,$4,$5)",
            [comment.rows[0].author_id, user!.id, `${user!.display_name} أعجب بتعليقك.`, comment.rows[0].post_id, commentId],
          );
        }
        return true;
      }
      await client.query("DELETE FROM comment_likes WHERE comment_id=$1 AND user_id=$2", [commentId, user!.id]);
      return false;
    });

    if (pushRecipient) {
      await sendPushToUser(pushRecipient, {
        title: "إعجاب جديد على تعليقك",
        body: "فيه حد أعجب بتعليقك على AXIS.",
        url: "/notifications",
      });
    }

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
