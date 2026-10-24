import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ userId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  const { userId } = await context.params;
  if (!UUID.test(userId)) return jsonError("حساب المهندس غير صالح.", 400);
  if (userId === user!.id) return jsonError("مش محتاج تتابع نفسك 🙂", 400);
  if (await consumeRateLimit("follow-user", `${requestIpKey(request)}:${user!.id}`, { limit: 80, windowMinutes: 60, blockMinutes: 30 })) return jsonError("نشاط متابعة كتير في وقت قصير. جرّب بعد شوية.", 429);
  try {
    const result = await withTransaction(async client => {
      const target = await client.query<{ id: string; display_name: string }>(`SELECT id,display_name FROM users WHERE id=$1 AND account_status='active' AND (verification_status='verified' OR role IN ('admin','reviewer','moderator'))`, [userId]);
      if (!target.rows[0]) throw Object.assign(new Error("الحساب غير موجود أو غير متاح."), { statusCode: 404 });
      const inserted = await client.query("INSERT INTO user_follows(follower_id,following_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING following_id", [user!.id, userId]);
      if (inserted.rowCount && inserted.rowCount > 0) {
        await client.query("INSERT INTO notifications(user_id,actor_id,kind,message,target_user_id) VALUES($1,$2,'follow',$3,$4)", [userId,user!.id,`${user!.display_name} بدأ يتابعك.`,user!.id]);
      }
      const count = await client.query<{ count: number }>("SELECT count(*)::int AS count FROM user_follows WHERE following_id=$1", [userId]);
      return { following: true, followerCount: Number(count.rows[0]?.count || 0) };
    });
    return NextResponse.json(result);
  } catch (error) { const status = (error as { statusCode?: number }).statusCode || 500; return jsonError(error instanceof Error ? error.message : "ما قدرناش نتابع الحساب دلوقتي.", status); }
}
export async function DELETE(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  const { userId } = await context.params;
  if (!UUID.test(userId)) return jsonError("حساب المهندس غير صالح.", 400);
  await query("DELETE FROM user_follows WHERE follower_id=$1 AND following_id=$2", [user!.id,userId]);
  const count = await query<{ count: number }>("SELECT count(*)::int AS count FROM user_follows WHERE following_id=$1", [userId]);
  return NextResponse.json({ following: false, followerCount: Number(count.rows[0]?.count || 0) });
}
