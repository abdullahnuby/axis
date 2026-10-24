import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { getApiUser, cleanText, jsonError, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ postId: string }> };
export async function GET(_request: Request, context: Ctx) {
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  const { postId } = await context.params;
  const visible = await query("SELECT p.id FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=$1 AND u.verification_status='verified' AND u.account_status='active'", [postId]);
  if (!visible.rows[0]) return jsonError("المنشور غير موجود.", 404);
  const result = await query(`SELECT c.id,c.post_id,c.author_id,u.display_name,u.username,u.role AS author_role,u.seniority_code,u.verified_badges,c.body,c.created_at
    FROM comments c JOIN users u ON u.id=c.author_id WHERE c.post_id=$1 AND u.verification_status='verified' AND u.account_status='active' ORDER BY c.created_at ASC LIMIT 100`, [postId]);
  return NextResponse.json({ comments: result.rows });
}
export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  const { postId } = await context.params;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return jsonError("التعليق غير صالح."); }
  const text = cleanText(body.body, 1200); if (!text) return jsonError("اكتب تعليقًا قبل الإرسال.");
  try {
    const comment = await withTransaction(async client => {
      const post = await client.query<{ author_id: string }>("SELECT p.author_id FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=$1 AND u.verification_status='verified' AND u.account_status='active'", [postId]);
      if (!post.rows[0]) throw Object.assign(new Error("المنشور غير موجود."), { statusCode: 404 });
      const result = await client.query(`INSERT INTO comments(post_id,author_id,body) VALUES($1,$2,$3) RETURNING id,post_id,author_id,body,created_at`, [postId, user!.id, text]);
      if (post.rows[0].author_id !== user!.id) await client.query("INSERT INTO notifications(user_id,actor_id,kind,message,target_post_id) VALUES($1,$2,'comment',$3,$4)", [post.rows[0].author_id, user!.id, `${user!.display_name} علّق على منشورك.`, postId]);
      return result.rows[0];
    });
    return NextResponse.json({ comment: { ...comment, display_name: user!.display_name, username: user!.username, author_role: user!.role, seniority_code: user!.seniority_code, verified_badges: user!.verified_badges } }, { status: 201 });
  } catch (error) { const status = (error as { statusCode?: number })?.statusCode; return jsonError(error instanceof Error ? error.message : "تعذر إضافة التعليق.", status || 500); }
}
