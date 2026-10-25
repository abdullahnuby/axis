import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, cleanText, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ postId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  const { postId } = await context.params; if (!UUID.test(postId)) return jsonError("المنشور غير صالح.", 400); let body: Record<string, unknown>; try { body = await request.json(); } catch { return jsonError("البلاغ غير صالح."); }
  const reason = cleanText(body.reason, 1000); if (reason.length < 3) return jsonError("اكتب سببًا واضحًا للإبلاغ.");
  if (await consumeRateLimit("report-content", `${requestIpKey(request)}:${user!.id}`, { limit: 10, windowMinutes: 60, blockMinutes: 60 })) return jsonError("عدد البلاغات كبير في وقت قصير. جرّب بعد شوية.", 429);
  const exists = await query(`SELECT p.id,p.author_id FROM posts p LEFT JOIN engineering_groups g ON g.id=p.group_id WHERE p.id=$1 AND (p.group_id IS NULL OR g.visibility='public' OR EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id=p.group_id AND gm.user_id=$2 AND gm.status='active'))`, [postId,user!.id]); if (!exists.rows.length) return jsonError("المنشور غير موجود أو مش متاح لحسابك.", 404);
  if (exists.rows[0].author_id === user!.id) return jsonError("مش ممكن تبلغ عن منشورك أنت.", 400);
  const duplicate = await query("SELECT 1 FROM reports WHERE reporter_id=$1 AND target_type='post' AND target_id=$2 AND status='open' LIMIT 1", [user!.id, postId]);
  if (duplicate.rows.length) return jsonError("أنت بلغت عن المنشور ده بالفعل، والفريق هيراجعه.", 409);
  await query("INSERT INTO reports(reporter_id,target_type,target_id,reason) VALUES($1,'post',$2,$3)", [user!.id, postId, reason]);
  return NextResponse.json({ ok: true }, { status: 201 });
}
