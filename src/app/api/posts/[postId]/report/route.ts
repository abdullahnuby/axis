import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, cleanText, jsonError, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ postId: string }> };
export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  const { postId } = await context.params; let body: Record<string, unknown>; try { body = await request.json(); } catch { return jsonError("البلاغ غير صالح."); }
  const reason = cleanText(body.reason, 1000); if (reason.length < 3) return jsonError("اكتب سببًا واضحًا للإبلاغ.");
  const exists = await query("SELECT id FROM posts WHERE id=$1", [postId]); if (!exists.rows.length) return jsonError("المنشور غير موجود.", 404);
  await query("INSERT INTO reports(reporter_id,target_type,target_id,reason) VALUES($1,'post',$2,$3)", [user!.id, postId, reason]);
  return NextResponse.json({ ok: true }, { status: 201 });
}
