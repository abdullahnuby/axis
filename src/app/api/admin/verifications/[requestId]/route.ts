import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { getApiUser, cleanText, jsonError, sameOrigin } from "@/lib/http";
import { BADGE_OPTIONS, SPECIALTIES, seniorityFromYears } from "@/lib/constants";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ requestId: string }> };
export async function PATCH(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ admin: true }); if (response) return response;
  if (!["admin", "reviewer"].includes(user!.role)) return jsonError("لا تملك صلاحية مراجعة التوثيق.", 403);
  const { requestId } = await context.params;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return jsonError("القرار غير صالح."); }
  const action = body.action;
  if (!["approve", "reject", "needs_info"].includes(String(action))) return jsonError("قرار المراجعة غير صالح.");
  const note = cleanText(body.note, 1000) || null;
  const years = Number(body.approvedYears);
  const jobTitle = cleanText(body.jobTitle, 100) || null;
  const specialty = cleanText(body.specialty, 80);
  const expertApproved = body.expertApproved === true;
  const requestedBadges = Array.isArray(body.badges) ? body.badges.filter((item): item is string => typeof item === "string") : [];
  const allowedBadges = (BADGE_OPTIONS as readonly { code: string; label: string }[]).map(b => b.code);
  const badges = [...new Set(requestedBadges)].filter(code => allowedBadges.includes(code));
  if (action === "approve") {
    if (!Number.isFinite(years) || years < 0 || years > 60) return jsonError("أدخل سنوات خبرة بين 0 و60.");
    if (!(SPECIALTIES as readonly string[]).includes(specialty)) return jsonError("التخصص غير صالح.");
    if (expertApproved && years < 10) return jsonError("مستوى EXP يتطلب 10 سنوات على الأقل ومراجعة المسؤوليات.");
  }
  try {
    await withTransaction(async client => {
      const requestRow = await client.query<{ user_id: string; status: string }>("SELECT user_id,status FROM verification_requests WHERE id=$1 FOR UPDATE", [requestId]);
      if (!requestRow.rows[0]) throw Object.assign(new Error("طلب التوثيق غير موجود."), { statusCode: 404 });
      const targetUser = requestRow.rows[0].user_id;
      if (action === "approve") {
        const level = seniorityFromYears(years, expertApproved);
        await client.query("UPDATE verification_requests SET status='approved',review_note=$1,reviewed_by=$2,reviewed_at=now() WHERE id=$3", [note, user!.id, requestId]);
        await client.query(`UPDATE users SET verification_status='verified',approved_years=$1,seniority_code=$2,job_title=$3,specialty=$4,verified_badges=$5 WHERE id=$6`, [years, level, jobTitle, specialty, badges, targetUser]);
        await client.query("INSERT INTO notifications(user_id,actor_id,kind,message) VALUES($1,$2,'verification','تم اعتماد عضويتك وفتح حسابك في مجتمع AXIS.')", [targetUser, user!.id]);
        await client.query("INSERT INTO audit_logs(actor_id,action,target_type,target_id,metadata) VALUES($1,'verification_approved','verification_request',$2,$3::jsonb)", [user!.id, requestId, JSON.stringify({ years, level, badgeCount: badges.length })]);
      } else if (action === "reject") {
        await client.query("UPDATE verification_requests SET status='rejected',review_note=$1,reviewed_by=$2,reviewed_at=now() WHERE id=$3", [note, user!.id, requestId]);
        await client.query("UPDATE users SET verification_status='rejected' WHERE id=$1", [targetUser]);
        await client.query("INSERT INTO notifications(user_id,actor_id,kind,message) VALUES($1,$2,'verification',$3)", [targetUser, user!.id, note ? `لم يتم قبول طلب التوثيق. ملاحظة الإدارة: ${note}` : "لم يتم قبول طلب التوثيق. يمكنك مراجعة بياناتك وإعادة التقديم."]);
        await client.query("INSERT INTO audit_logs(actor_id,action,target_type,target_id,metadata) VALUES($1,'verification_rejected','verification_request',$2,$3::jsonb)", [user!.id, requestId, JSON.stringify({ hasNote: !!note })]);
      } else {
        await client.query("UPDATE verification_requests SET status='needs_info',review_note=$1,reviewed_by=$2,reviewed_at=now() WHERE id=$3", [note, user!.id, requestId]);
        await client.query("UPDATE users SET verification_status='needs_info' WHERE id=$1", [targetUser]);
        await client.query("INSERT INTO notifications(user_id,actor_id,kind,message) VALUES($1,$2,'verification',$3)", [targetUser, user!.id, note ? `تحتاج بيانات التوثيق إلى استكمال: ${note}` : "تحتاج بيانات التوثيق إلى استكمال. أعد إرسال الطلب بالمعلومات المطلوبة."]);
        await client.query("INSERT INTO audit_logs(actor_id,action,target_type,target_id,metadata) VALUES($1,'verification_more_info','verification_request',$2,$3::jsonb)", [user!.id, requestId, JSON.stringify({ hasNote: !!note })]);
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) { const status = (error as { statusCode?: number })?.statusCode; return jsonError(error instanceof Error ? error.message : "تعذر حفظ القرار.", status || 500); }
}
