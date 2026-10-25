import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cleanText, getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ commentId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const { commentId } = await context.params;
  if (!UUID.test(commentId)) return jsonError("التعليق غير صالح.", 400);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return jsonError("بيانات البلاغ غير صالحة."); }
  const reason = cleanText(input.reason, 1000);
  if (reason.length < 3) return jsonError("اكتب سببًا واضحًا للإبلاغ.");
  if (await consumeRateLimit("report-content", `${requestIpKey(request)}:${user!.id}`, { limit: 10, windowMinutes: 60, blockMinutes: 60 })) return jsonError("عدد البلاغات كبير في وقت قصير. جرّب بعد شوية.", 429);
  try {
    const result = await query<{ id: string; author_id: string }>(
      `SELECT c.id,c.author_id FROM comments c
       JOIN posts p ON p.id=c.post_id LEFT JOIN engineering_groups g ON g.id=p.group_id
       WHERE c.id=$1 AND (p.group_id IS NULL OR g.visibility='public' OR EXISTS(
         SELECT 1 FROM group_members gm WHERE gm.group_id=p.group_id AND gm.user_id=$2 AND gm.status='active'))`,
      [commentId, user!.id],
    );
    const comment = result.rows[0];
    if (!comment) return jsonError("التعليق غير موجود أو مش متاح لحسابك.", 404);
    if (comment.author_id === user!.id) return jsonError("مش ممكن تبلغ عن تعليقك أنت.", 400);
    const duplicate = await query("SELECT 1 FROM reports WHERE reporter_id=$1 AND target_type='comment' AND target_id=$2 AND status='open' LIMIT 1", [user!.id, commentId]);
    if (duplicate.rows.length) return jsonError("أنت بلغت عن التعليق ده بالفعل، والفريق هيراجعه.", 409);
    await query("INSERT INTO reports(reporter_id,target_type,target_id,reason) VALUES($1,'comment',$2,$3)", [user!.id, commentId, reason]);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("AXIS comment report error", (error as { code?: string })?.code || "database_error");
    return jsonError("ما قدرناش نبعت البلاغ دلوقتي. جرّب تاني.", 500);
  }
}
