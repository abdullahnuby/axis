import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cleanText, getApiUser } from "@/lib/http";
import { SPECIALTIES } from "@/lib/constants";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const url = new URL(request.url);
  const q = cleanText(url.searchParams.get("q"), 100);
  const specialty = cleanText(url.searchParams.get("specialty"), 80);
  const limit = Math.min(40, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "24", 10) || 24));
  const offset = Math.min(2000, Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0));
  if (specialty && !(SPECIALTIES as readonly string[]).includes(specialty)) {
    return NextResponse.json({ error: "التخصص المحدد غير صالح." }, { status: 400 });
  }
  try {
    const result = await query(`SELECT u.id,u.username,u.display_name,u.specialty,u.job_title,u.bio,u.seniority_code,
        u.verified_badges,u.avatar_color,(u.avatar_image_mime IS NOT NULL) AS has_avatar,u.approved_years,u.created_at,
        (SELECT count(*)::int FROM user_follows f WHERE f.following_id=u.id) AS follower_count,
        (SELECT count(*)::int FROM user_follows f WHERE f.follower_id=u.id) AS following_count,
        EXISTS(SELECT 1 FROM user_follows mine WHERE mine.follower_id=$1 AND mine.following_id=u.id) AS is_following
      FROM users u
      WHERE u.id<>$1 AND u.account_status='active'
        AND (u.verification_status='verified' OR u.role IN ('admin','reviewer','moderator'))
        AND ($2='' OR u.display_name ILIKE '%'||$2||'%' OR u.username ILIKE '%'||$2||'%' OR COALESCE(u.job_title,'') ILIKE '%'||$2||'%')
        AND ($3='' OR u.specialty=$3)
      ORDER BY follower_count DESC,u.created_at DESC
      LIMIT $4 OFFSET $5`, [user!.id, q, specialty, limit, offset]);
    return NextResponse.json({ people: result.rows, limit, offset, hasMore: result.rows.length === limit });
  } catch (error) {
    console.error("AXIS people directory error", (error as { code?: string })?.code || "database_error");
    return NextResponse.json({ error: "مش قادرين نحمّل دليل المهندسين دلوقتي." }, { status: 500 });
  }
}
