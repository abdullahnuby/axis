import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin, cleanText } from "@/lib/http";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ reportId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ReportRow = { id: string; target_type: "post" | "comment" | "user"; target_id: string; status: string };

export async function PATCH(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ admin: true });
  if (response) return response;
  if (!["admin", "moderator"].includes(user!.role)) return jsonError("لا تملك صلاحية إدارة البلاغات.", 403);
  const { reportId } = await context.params;
  if (!UUID.test(reportId)) return jsonError("رقم البلاغ غير صالح.", 400);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError("بيانات غير صالحة."); }
  const status = body.status;
  if (!( ["reviewed", "dismissed", "actioned"] as unknown[]).includes(status)) return jsonError("حالة البلاغ غير صالحة.");
  const applyAction = body.applyAction === true;
  if (status === "actioned" && !applyAction) return jsonError("اختَر الإجراء الفعلي قبل إغلاق البلاغ على أنه تم التعامل معه.", 400);
  if (applyAction && status !== "actioned") return jsonError("حالة البلاغ لا تتوافق مع الإجراء المطلوب.", 400);
  const note = cleanText(body.note, 1000) || null;

  try {
    const result = await withTransaction(async client => {
      const locked = await client.query<ReportRow>("SELECT id,target_type,target_id,status FROM reports WHERE id=$1 FOR UPDATE", [reportId]);
      const report = locked.rows[0];
      if (!report) throw Object.assign(new Error("البلاغ غير موجود."), { statusCode: 404 });
      if (report.status !== "open") throw Object.assign(new Error("تم التعامل مع البلاغ بالفعل."), { statusCode: 409 });

      let actionMessage = "تم تحديث حالة البلاغ.";
      if (applyAction) {
        if (report.target_type === "post") {
          await client.query(
            `UPDATE posts SET body = CASE WHEN length(btrim(body)) > 0
              THEN body || E'\n\nالمنشور الأصلي لم يعد متاحًا.'
              ELSE 'المنشور الأصلي لم يعد متاحًا.' END,
              shared_post_id = NULL, updated_at = now()
             WHERE shared_post_id = $1`,
            [report.target_id],
          );
          await client.query("DELETE FROM posts WHERE id=$1", [report.target_id]);
          actionMessage = "تم حذف المنشور الأصلي وإغلاق البلاغ، مع الاحتفاظ بمشاركات الأعضاء التي كانت تشير إليه.";
        } else if (report.target_type === "comment") {
          await client.query("DELETE FROM comments WHERE id=$1", [report.target_id]);
          actionMessage = "تم حذف التعليق وردوده التابعة وإغلاق البلاغ.";
        } else if (report.target_type === "user") {
          if (user!.role !== "admin") throw Object.assign(new Error("إيقاف الحسابات بسبب البلاغات متاح لمدير النظام فقط."), { statusCode: 403 });
          const suspended = await client.query("UPDATE users SET account_status='suspended' WHERE id=$1 AND role='member' RETURNING id", [report.target_id]);
          if (!suspended.rows.length) throw Object.assign(new Error("الحساب غير موجود أو لا يمكن إيقاف حساب إداري من خلال هذا الإجراء."), { statusCode: 409 });
          await client.query("DELETE FROM sessions WHERE user_id=$1", [report.target_id]);
          actionMessage = "تم إيقاف الحساب وإنهاء جلساته وإغلاق البلاغ.";
        }
      }

      const updated = await client.query(
        "UPDATE reports SET status=$1,admin_note=$2,resolved_by=$3,resolved_at=now() WHERE id=$4 RETURNING id,status,target_type,target_id",
        [status, note, user!.id, reportId],
      );
      await client.query(
        "INSERT INTO audit_logs(actor_id,action,target_type,target_id,metadata) VALUES($1,$2,$3,$4,$5::jsonb)",
        [user!.id, applyAction ? "report_action_applied" : "report_resolved", report.target_type, report.target_id, JSON.stringify({ reportId, status, note, actionApplied: applyAction })],
      );
      return { report: updated.rows[0], message: actionMessage };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    if (statusCode >= 500) console.error("AXIS report action error", (error as { code?: string }).code || "database_error");
    return jsonError(error instanceof Error ? error.message : "ما قدرناش نعالج البلاغ دلوقتي.", statusCode);
  }
}
