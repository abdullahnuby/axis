import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ userId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ admin: true });
  if (response) return response;
  if (!["admin", "reviewer"].includes(user!.role)) return jsonError("لا تملك صلاحية متابعة توثيق العضوية.", 403);

  const { userId } = await context.params;
  if (!UUID.test(userId)) return jsonError("حساب العضو غير صالح.", 400);

  try {
    await withTransaction(async client => {
      const target = await client.query<{ id: string; verification_status: string; account_status: string }>(
        "SELECT id,verification_status,account_status FROM users WHERE id=$1 AND role='member' FOR UPDATE",
        [userId],
      );
      const member = target.rows[0];
      if (!member || member.account_status !== "active") {
        throw Object.assign(new Error("الحساب غير موجود أو غير نشط."), { statusCode: 404 });
      }
      if (member.verification_status === "verified") {
        throw Object.assign(new Error("العضوية موثّقة بالفعل."), { statusCode: 409 });
      }
      const existing = await client.query("SELECT id FROM verification_requests WHERE user_id=$1 LIMIT 1", [userId]);
      if (existing.rows.length) {
        throw Object.assign(new Error("العضو قدّم طلب توثيق بالفعل. حدّث قائمة الطلبات."), { statusCode: 409 });
      }

      // Re-open the verification form on the member's next visit. Do not verify or grant access here.
      await client.query("UPDATE users SET verification_status='needs_info' WHERE id=$1", [userId]);
      await client.query(
        "INSERT INTO notifications(user_id,actor_id,kind,message) VALUES($1,$2,'verification',$3)",
        [userId, user!.id, "الإدارة أعادت فتح خطوة التوثيق. ادخل رقم عضوية النقابة وأرسل الطلب علشان نقدر نراجعه."],
      );
      await client.query(
        "INSERT INTO audit_logs(actor_id,action,target_type,target_id,metadata) VALUES($1,'verification_step_reopened','user',$2,$3::jsonb)",
        [user!.id, userId, JSON.stringify({ reason: "no_verification_request" })],
      );
    });
    await sendPushToUser(userId, { title: "استكمل توثيق عضويتك في AXIS", body: "الإدارة أعادت فتح خطوة التوثيق. ادخل رقم عضوية النقابة وأرسل الطلب.", url: "/verification", tag: "axis-verification" });
    return NextResponse.json({
      ok: true,
      message: "تمت إعادة الحساب إلى خطوة التوثيق. لازم العضو يدخل رقم عضوية النقابة ويرسل الطلب قبل ما تقدر توافق عليه.",
    });
  } catch (error) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    console.error("AXIS reopen verification error", (error as { code?: string })?.code || "verification_reopen_error");
    return jsonError(error instanceof Error ? error.message : "تعذر إعادة الحساب لخطوة التوثيق.", statusCode || 500);
  }
}
