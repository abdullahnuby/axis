import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";
import { cleanText, getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ postId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;

  const { postId } = await context.params;
  if (!UUID.test(postId)) return jsonError("المنشور غير صالح.", 400);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return jsonError("بيانات المشاركة غير صالحة."); }
  if (await consumeRateLimit("share-post", `${requestIpKey(request)}:${user!.id}`, { limit: 20, windowMinutes: 60, blockMinutes: 30 })) return jsonError("مشاركات كتير في وقت قصير. جرّب بعد شوية.", 429);
  const caption = cleanText(input.caption, 5000);
  if (caption.length > 5000) return jsonError("التعليق على المشاركة أطول من الحد المسموح.");

  try {
    // If a repost is shared again, point at the original post rather than nesting repost wrappers.
    const source = await query<{ source_id: string; specialty: string | null }>(
      `SELECT COALESCE(p.shared_post_id, p.id)::text AS source_id,
              COALESCE(original.specialty, source_author.specialty) AS specialty
         FROM posts p
         JOIN users p_author ON p_author.id = p.author_id
         JOIN posts original ON original.id = COALESCE(p.shared_post_id, p.id)
         JOIN users source_author ON source_author.id = original.author_id
        WHERE p.id = $1 AND p.group_id IS NULL
          AND original.group_id IS NULL
          AND p_author.account_status = 'active' AND p_author.verification_status = 'verified'
          AND source_author.account_status = 'active' AND source_author.verification_status = 'verified'
        LIMIT 1`,
      [postId],
    );
    if (!source.rows[0]) return jsonError("المنشور مش متاح للمشاركة دلوقتي.", 404);

    const created = await query<{ id: string; created_at: string }>(
      `INSERT INTO posts (author_id, body, specialty, shared_post_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [user!.id, caption, source.rows[0].specialty || user!.specialty || null, source.rows[0].source_id],
    );
    const originalAuthor = await query<{author_id:string}>("SELECT author_id FROM posts WHERE id=$1",[source.rows[0].source_id]);
    if (originalAuthor.rows[0]?.author_id && originalAuthor.rows[0].author_id !== user!.id) {
      await query("INSERT INTO notifications(user_id,actor_id,kind,message,target_post_id) VALUES($1,$2,'share',$3,$4)", [originalAuthor.rows[0].author_id,user!.id,`${user!.display_name} أعاد مشاركة منشورك.`,source.rows[0].source_id]);
      await sendPushToUser(originalAuthor.rows[0].author_id, { title: "منشورك اتشارك على AXIS", body: "أحد المهندسين أعاد مشاركة منشورك.", url: "/notifications" });
    }
    return NextResponse.json({ ok: true, postId: created.rows[0].id, redirect: "/feed", destination: "profile-and-feed" }, { status: 201 });
  } catch (error) {
    console.error("AXIS internal share error", (error as { code?: string })?.code || "database_error");
    return jsonError("ما قدرناش نشارك المنشور على حسابك دلوقتي. جرّب تاني.", 500);
  }
}
