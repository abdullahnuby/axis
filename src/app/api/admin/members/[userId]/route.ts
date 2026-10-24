import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ userId: string }> };
export async function PATCH(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ admin: true }); if (response) return response;
  if (user!.role !== "admin") return jsonError("إدارة حالة الأعضاء متاحة لمدير النظام فقط.", 403);
  const { userId } = await context.params;
  if (userId === user!.id) return jsonError("لا يمكنك إيقاف حسابك الحالي.", 400);
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return jsonError("بيانات غير صالحة."); }
  const accountStatus = body.accountStatus;
  if (!(["active", "suspended"] as unknown[]).includes(accountStatus)) return jsonError("الحالة غير صالحة.");
  const result = await query("UPDATE users SET account_status=$1 WHERE id=$2 AND role='member' RETURNING id,account_status", [accountStatus, userId]);
  if (!result.rows.length) return jsonError("العضو غير موجود.", 404);
  if (accountStatus === "suspended") await query("DELETE FROM sessions WHERE user_id=$1", [userId]);
  await query("INSERT INTO audit_logs(actor_id,action,target_type,target_id,metadata) VALUES($1,$2,'user',$3,$4::jsonb)", [user!.id, accountStatus === "suspended" ? "member_suspended" : "member_reactivated", userId, JSON.stringify({ accountStatus })]);
  return NextResponse.json({ ok: true, member: result.rows[0] });
}
