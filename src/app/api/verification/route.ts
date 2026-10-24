import { NextResponse } from "next/server";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { encryptMembershipNumber, membershipFingerprint } from "@/lib/crypto";
import { withTransaction, query } from "@/lib/db";
import { parseSafeUpload, type SafeUpload } from "@/lib/upload";
import { SPECIALTIES } from "@/lib/constants";
export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await getApiUser(); if (response) return response;
  const result = await query<{ status: string; review_note: string | null; created_at: string }>("SELECT status,review_note,created_at FROM verification_requests WHERE user_id=$1", [user!.id]);
  return NextResponse.json({ request: result.rows[0] || null, verificationStatus: user!.verification_status });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser(); if (response) return response;
  if (user!.role !== "member") return jsonError("لا يمكن لهذا الحساب إنشاء طلب توثيق عضو.", 403);
  if (user!.verification_status === "verified") return jsonError("حسابك موثّق بالفعل.", 409);
  let form: FormData;
  try { form = await request.formData(); } catch { return jsonError("تعذر قراءة ملفات الطلب."); }
  const legalName = String(form.get("legalName") || "").trim().slice(0, 120);
  const membershipNumber = String(form.get("membershipNumber") || "").trim().slice(0, 80);
  const specialty = String(form.get("specialty") || "").trim();
  const applicantNote = String(form.get("applicantNote") || "").trim().slice(0, 1000) || null;
  if (legalName.length < 3) return jsonError("اكتب الاسم الحقيقي كما يظهر في إثبات العضوية.");
  if (membershipNumber.replace(/[\s-]/g, "").length < 4) return jsonError("رقم العضوية غير مكتمل.");
  if (!(SPECIALTIES as readonly string[]).includes(specialty)) return jsonError("اختر تخصصًا هندسيًا صالحًا.");
  let membershipProof, experienceProof, degreeProof, certificateProof;
  try {
    membershipProof = await parseSafeUpload(form.get("membershipProof"), { allowPdf: true, maxBytes: 2_500_000 });
    experienceProof = await parseSafeUpload(form.get("experienceProof"), { allowPdf: true, maxBytes: 2_500_000 });
    degreeProof = await parseSafeUpload(form.get("degreeProof"), { allowPdf: true, maxBytes: 2_500_000 });
    certificateProof = await parseSafeUpload(form.get("certificateProof"), { allowPdf: true, maxBytes: 2_500_000 });
  } catch (error) { return jsonError(error instanceof Error ? error.message : "نوع ملف غير مسموح."); }
  if (!membershipProof) return jsonError("إثبات العضوية النقابية إلزامي.");
  const files: { category: string; file: SafeUpload }[] = [{ category: "membership", file: membershipProof }];
  if (experienceProof) files.push({ category: "experience", file: experienceProof });
  if (degreeProof) files.push({ category: "degree", file: degreeProof });
  if (certificateProof) files.push({ category: "certificate", file: certificateProof });
  if (files.reduce((sum, item) => sum + item.file.size, 0) > 4_000_000) return jsonError("إجمالي المرفقات يجب ألا يتجاوز 4 ميجابايت في الطلب الواحد.");
  try {
    const fingerprint = membershipFingerprint(membershipNumber);
    const encrypted = encryptMembershipNumber(membershipNumber);
    await withTransaction(async client => {
      const duplicate = await client.query("SELECT user_id FROM verification_requests WHERE membership_fingerprint=$1 FOR UPDATE", [fingerprint]);
      if (duplicate.rows[0] && duplicate.rows[0].user_id !== user!.id) throw Object.assign(new Error("رقم العضوية مستخدم في طلب آخر. تواصل مع الإدارة إذا كان هناك خطأ."), { statusCode: 409 });
      const existing = await client.query("SELECT id FROM verification_requests WHERE user_id=$1 FOR UPDATE", [user!.id]);
      let requestId: string;
      if (existing.rows[0]) {
        requestId = existing.rows[0].id;
        await client.query(`UPDATE verification_requests SET legal_name=$1, membership_number_encrypted=$2, membership_fingerprint=$3,
          status='pending', applicant_note=$4, review_note=NULL, reviewed_by=NULL, reviewed_at=NULL, updated_at=now() WHERE id=$5`, [legalName, encrypted, fingerprint, applicantNote, requestId]);
        await client.query("DELETE FROM verification_documents WHERE request_id=$1", [requestId]);
      } else {
        const inserted = await client.query(`INSERT INTO verification_requests(user_id,legal_name,membership_number_encrypted,membership_fingerprint,status,applicant_note)
          VALUES($1,$2,$3,$4,'pending',$5) RETURNING id`, [user!.id, legalName, encrypted, fingerprint, applicantNote]);
        requestId = inserted.rows[0].id;
      }
      for (const entry of files) {
        await client.query("INSERT INTO verification_documents(request_id,category,original_name,content_type,content,size_bytes) VALUES($1,$2,$3,$4,$5,$6)", [requestId, entry.category, entry.file.name, entry.file.mime, entry.file.buffer, entry.file.size]);
      }
      await client.query("UPDATE users SET verification_status='pending', specialty=$1 WHERE id=$2", [specialty, user!.id]);
      await client.query("INSERT INTO audit_logs(actor_id,action,target_type,target_id,metadata) VALUES($1,'verification_submitted','verification_request',$2,$3::jsonb)", [user!.id, requestId, JSON.stringify({ documentCount: files.length })]);
    });
    return NextResponse.json({ ok: true, status: "pending" });
  } catch (error) {
    const status = (error as { statusCode?: number; code?: string })?.statusCode;
    if (status) return jsonError(error instanceof Error ? error.message : "طلب غير صالح.", status);
    if ((error as { code?: string })?.code === "23505") return jsonError("رقم العضوية مستخدم في طلب آخر. تواصل مع الإدارة إذا كان هناك خطأ.", 409);
    console.error("AXIS verification submit error", (error as { code?: string })?.code || "database_error");
    return jsonError("تعذر إرسال طلب التوثيق. حاول مرة أخرى.", 500);
  }
}
