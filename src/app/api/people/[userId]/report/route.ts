import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cleanText, getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ userId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const { userId } = await context.params;
  if (!UUID.test(userId)) return jsonError("الحساب غير صالح.", 400);
  if (userId === user!.id) return jsonError("مش ممكن تبلغ عن حسابك أنت.", 400);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return jsonError("بيانات البلاغ غير صالحة."); }
  const reason = cleanText(input.reason, 1000);
  if (reason.length < 3) return jsonError("اكتب سببًا واضحًا للإبلاغ.");
  if (await consumeRateLimit("report-content", `${requestIpKey(request)}:${user!.id}`, { limit: 10, windowMinutes: 60, blockMinutes: 60 })) return jsonError("عدد البلاغات كبير في وقت قصير. جرّب بعد شوية.", 429);
  try {
    const target = await query<{ id: string; role: string }>("SELECT id,role FROM users WHERE id=$1 AND account_status='active' AND (verification_status='verified' OR role IN ('admin','reviewer','moderator'))", [userId]);
    if (!target.rows[0]) return jsonError("الحساب غير موجود أو مش متاح.", 404);
    const duplicate = await query("SELECT 1 FROM reports WHERE reporter_id=$1 AND target_type='user' AND target_id=$2 AND status='open' LIMIT 1", [user!.id, userId]);
    if (duplicate.rows.length) return jsonError("أنت بلغت عن الحساب ده بالفعل، والفريق هيراجعه.", 409);
    await query("INSERT INTO reports(reporter_id,target_type,target_id,reason) VALUES($1,'user',$2,$3)", [user!.id, userId, reason]);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("AXIS user report error", (error as { code?: string })?.code || "database_error");
    return jsonError("ما قدرناش نبعت البلاغ دلوقتي. جرّب تاني.", 500);
  }
}
