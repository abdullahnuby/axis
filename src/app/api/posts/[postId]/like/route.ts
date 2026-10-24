import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ postId: string }> };
export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  const { postId } = await context.params;
  try {
    const liked = await withTransaction(async client => {
      const post = await client.query<{ author_id: string }>("SELECT p.author_id FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=$1 AND u.verification_status='verified' AND u.account_status='active'", [postId]);
      if (!post.rows[0]) throw Object.assign(new Error("المنشور غير موجود."), { statusCode: 404 });
      const insert = await client.query("INSERT INTO post_likes(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING post_id", [postId, user!.id]);
      if (insert.rows.length) {
        if (post.rows[0].author_id !== user!.id) await client.query("INSERT INTO notifications(user_id,actor_id,kind,message,target_post_id) VALUES($1,$2,'like',$3,$4)", [post.rows[0].author_id, user!.id, `${user!.display_name} أعجب بمنشورك.`, postId]);
        return true;
      }
      await client.query("DELETE FROM post_likes WHERE post_id=$1 AND user_id=$2", [postId, user!.id]);
      return false;
    });
    const count = await query<{ count: number }>("SELECT count(*)::int AS count FROM post_likes WHERE post_id=$1", [postId]);
    return NextResponse.json({ liked, likeCount: count.rows[0]?.count || 0 });
  } catch (error) { const status = (error as { statusCode?: number })?.statusCode; return jsonError(error instanceof Error ? error.message : "ما قدرناش نحدّث الإعجاب. جرّب تاني.", status || 500); }
}
