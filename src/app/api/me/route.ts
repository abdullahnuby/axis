import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, cleanText, jsonError, sameOrigin } from "@/lib/http";
import { SPECIALTIES } from "@/lib/constants";
export const runtime = "nodejs";
export async function GET() { const { user, response } = await getApiUser({ verified: true }); if (response) return response; return NextResponse.json({ user }); }
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return jsonError("بيانات غير صالحة."); }
  const displayName = cleanText(body.displayName, 80); const specialty = cleanText(body.specialty, 80); const bio = cleanText(body.bio, 600);
  if (displayName.length < 2) return jsonError("اسم الظهور قصير جدًا.");
  if (specialty && !(SPECIALTIES as readonly string[]).includes(specialty)) return jsonError("التخصص غير صالح.");
  const result = await query("UPDATE users SET display_name=$1, specialty=$2, bio=$3,updated_at=now() WHERE id=$4 RETURNING id,email,username,display_name,role,verification_status,account_status,specialty,bio,job_title,approved_years,seniority_code,verified_badges,avatar_color,avatar_image_mime IS NOT NULL AS has_avatar,cover_image_mime IS NOT NULL AS has_cover,created_at,updated_at", [displayName, specialty || null, bio || null, user!.id]);
  return NextResponse.json({ user: result.rows[0] });
}
