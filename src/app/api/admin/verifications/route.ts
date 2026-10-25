import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { decryptMembershipNumber } from "@/lib/crypto";
import { getApiUser, cleanText, jsonError } from "@/lib/http";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await getApiUser({ admin: true }); if (response) return response;
  if (!["admin", "reviewer"].includes(user!.role)) return jsonError("لا تملك صلاحية مراجعة بيانات الهوية.", 403);
  const url = new URL(request.url); const status = cleanText(url.searchParams.get("status"), 20) || "pending";
  const valid = ["pending", "needs_info", "rejected", "approved", "all", "not_submitted"].includes(status) ? status : "pending";
  try {
    const result = await query(`SELECT vr.id,vr.user_id,vr.legal_name,vr.membership_number_encrypted,vr.status,vr.applicant_note,vr.review_note,vr.created_at,
      u.username,u.display_name,u.email,u.specialty,
      COALESCE((SELECT json_agg(json_build_object('id',d.id,'category',d.category,'original_name',d.original_name,'content_type',d.content_type,'size_bytes',d.size_bytes) ORDER BY d.created_at)
        FROM verification_documents d WHERE d.request_id=vr.id),'[]'::json) AS documents,
      true AS request_exists
      FROM verification_requests vr JOIN users u ON u.id=vr.user_id
      WHERE ($1='all' OR vr.status=$1) AND $1 <> 'not_submitted'
      ORDER BY CASE WHEN vr.status IN ('pending','needs_info') THEN 0 ELSE 1 END,vr.created_at ASC LIMIT 200`, [valid]);

    let rows: Record<string, unknown>[] = result.rows;
    if (["pending", "all", "not_submitted"].includes(valid)) {
      const unsubmitted = await query(`SELECT
          'no-request:' || u.id::text AS id,
          u.id AS user_id,
          u.display_name AS legal_name,
          NULL::text AS membership_number_encrypted,
          'not_submitted'::text AS status,
          NULL::text AS applicant_note,
          NULL::text AS review_note,
          u.created_at,
          u.username,
          u.display_name,
          u.email,
          u.specialty,
          '[]'::json AS documents,
          false AS request_exists
        FROM users u
        WHERE u.role='member'
          AND u.account_status='active'
          AND u.verification_status <> 'verified'
          AND NOT EXISTS (SELECT 1 FROM verification_requests vr WHERE vr.user_id=u.id)
        ORDER BY u.created_at ASC
        LIMIT 200`);
      rows = valid === "not_submitted" ? unsubmitted.rows : [...rows, ...unsubmitted.rows];
    }

    const requests = rows.map((row: Record<string, unknown>) => ({
      ...row,
      membership_number: row.membership_number_encrypted ? decryptMembershipNumber(String(row.membership_number_encrypted)) : null,
      membership_number_encrypted: undefined,
    }));
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("AXIS admin verification list error", (error as { code?: string })?.code || "database_error");
    return jsonError("تعذر تحميل طلبات التوثيق. تحقق من إعداد مفتاح التشفير.", 500);
  }
}
