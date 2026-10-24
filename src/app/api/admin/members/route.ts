import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, cleanText, jsonError } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const { user, response } = await getApiUser({ admin: true }); if (response) return response;
  if (user!.role !== "admin") return jsonError("إدارة قائمة الأعضاء متاحة لمدير النظام فقط.", 403);
  const q = cleanText(new URL(request.url).searchParams.get("q"), 100);
  const result = await query(`SELECT id,email,username,display_name,role,verification_status,account_status,seniority_code,approved_years,specialty,created_at
    FROM users WHERE role='member' AND ($1='' OR email ILIKE '%'||$1||'%' OR username ILIKE '%'||$1||'%' OR display_name ILIKE '%'||$1||'%') ORDER BY created_at DESC LIMIT 300`, [q]);
  return NextResponse.json({ members: result.rows });
}
