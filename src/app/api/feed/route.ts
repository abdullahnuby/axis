import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, cleanText, jsonError, sameOrigin } from "@/lib/http";
import { parseSafeUpload } from "@/lib/upload";
import { SPECIALTIES } from "@/lib/constants";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  const url = new URL(request.url);
  const specialty = cleanText(url.searchParams.get("specialty"), 80);
  const q = cleanText(url.searchParams.get("q"), 140);
  const sharedPostId = cleanText(url.searchParams.get("post"), 36);
  if (sharedPostId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sharedPostId)) return jsonError("رابط المنشور غير صالح.", 400);
  try {
    const result = await query(`SELECT p.id,p.author_id,u.username,u.display_name,u.role AS author_role,u.seniority_code,u.job_title,u.specialty AS profile_specialty,
      u.verified_badges,u.avatar_color,p.body,p.specialty,p.image_data IS NOT NULL AS has_image,p.image_mime,p.created_at,
      (SELECT count(*)::int FROM post_likes l WHERE l.post_id=p.id) AS like_count,
      (SELECT count(*)::int FROM comments c WHERE c.post_id=p.id) AS comment_count,
      EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id=p.id AND l.user_id=$1) AS has_liked
      FROM posts p JOIN users u ON u.id=p.author_id
      WHERE u.verification_status='verified' AND u.account_status='active'
        AND ($2 = '' OR p.specialty=$2 OR (p.specialty IS NULL AND u.specialty=$2))
        AND ($3 = '' OR p.body ILIKE '%'||$3||'%' OR u.display_name ILIKE '%'||$3||'%' OR u.username ILIKE '%'||$3||'%')
        AND ($4::uuid IS NULL OR p.id=$4::uuid)
      ORDER BY p.created_at DESC LIMIT 50`, [user!.id, specialty, q, sharedPostId || null]);
    const posts = result.rows.map((row: Record<string, unknown>) => ({ ...row, specialty: row.specialty || row.profile_specialty, profile_specialty: undefined }));
    return NextResponse.json({ posts });
  } catch (error) { console.error("AXIS feed error", (error as { code?: string })?.code || "database_error"); return jsonError("مش قادرين نحمّل المشاركات دلوقتي. جرّب تاني بعد شوية.", 500); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  let form: FormData; try { form = await request.formData(); } catch { return jsonError("بيانات المنشور غير صالحة."); }
  const body = cleanText(form.get("body"), 5000); const specialty = cleanText(form.get("specialty"), 80);
  const fileRaw = form.get("image");
  if (specialty && !(SPECIALTIES as readonly string[]).includes(specialty)) return jsonError("التخصص المحدد غير صالح.");
  let image: Awaited<ReturnType<typeof parseSafeUpload>> = null;
  try { image = await parseSafeUpload(fileRaw, { allowPdf: false, maxBytes: 2_000_000 }); }
  catch (error) { return jsonError(error instanceof Error ? error.message : "الصورة غير صالحة."); }
  if (!body && !image) return jsonError("اكتب حاجة تحب تشاركها، أو أرفق صورة.");
  if (body.length > 5000) return jsonError("المنشور أطول من الحد المسموح.");
  try {
    const result = await query<{ id: string }>(`INSERT INTO posts(author_id,body,specialty,image_data,image_mime,image_name)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, [user!.id, body, specialty || user!.specialty || null, image?.buffer || null, image?.mime || null, image?.name || null]);
    return NextResponse.json({ ok: true, postId: result.rows[0].id }, { status: 201 });
  } catch (error) { console.error("AXIS post create error", (error as { code?: string })?.code || "database_error"); return jsonError("ما قدرناش ننشر المشاركة دلوقتي. جرّب تاني.", 500); }
}
