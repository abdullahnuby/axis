import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin, cleanText } from "@/lib/http";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ reportId: string }> };
export async function PATCH(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ admin: true }); if (response) return response;
  if (!["admin", "moderator"].includes(user!.role)) return jsonError("لا تملك صلاحية إدارة البلاغات.", 403);
  const { reportId } = await context.params; let body: Record<string, unknown>; try { body = await request.json(); } catch { return jsonError("بيانات غير صالحة."); }
  const status = body.status; if (!(["reviewed", "dismissed", "actioned"] as unknown[]).includes(status)) return jsonError("حالة البلاغ غير صالحة.");
  const note = cleanText(body.note, 1000) || null;
  const result = await query("UPDATE reports SET status=$1,admin_note=$2,resolved_by=$3,resolved_at=now() WHERE id=$4 RETURNING id,status", [status, note, user!.id, reportId]);
  if (!result.rows.length) return jsonError("البلاغ غير موجود.", 404);
  await query("INSERT INTO audit_logs(actor_id,action,target_type,target_id,metadata) VALUES($1,'report_resolved','report',$2,$3::jsonb)", [user!.id, reportId, JSON.stringify({ status })]);
  return NextResponse.json({ ok: true, report: result.rows[0] });
}
