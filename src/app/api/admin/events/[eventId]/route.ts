import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ eventId: string }> };
export async function DELETE(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ admin: true }); if (response) return response;
  if (!["admin", "moderator"].includes(user!.role)) return jsonError("لا تملك صلاحية إدارة الأحداث.", 403);
  const { eventId } = await context.params; const result = await query("DELETE FROM events WHERE id=$1 RETURNING id", [eventId]);
  if (!result.rows.length) return jsonError("الحدث غير موجود.", 404);
  await query("INSERT INTO audit_logs(actor_id,action,target_type,target_id,metadata) VALUES($1,'event_deleted','event',$2,'{}'::jsonb)", [user!.id, eventId]);
  return NextResponse.json({ ok: true });
}
