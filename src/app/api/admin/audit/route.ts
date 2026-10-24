import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await getApiUser({ admin: true });
  if (response) return response;
  if (user!.role !== "admin") return jsonError("سجل القرارات متاح لمدير النظام فقط.", 403);

  try {
    const result = await query(`SELECT a.id, a.action, a.target_type, a.target_id, a.metadata, a.created_at,
        COALESCE(u.display_name, 'مستخدم سابق') AS actor_name
      FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id
      ORDER BY a.created_at DESC LIMIT 100`);
    return NextResponse.json({ entries: result.rows });
  } catch (error) {
    console.error("AXIS admin audit error", (error as { code?: string })?.code || "database_error");
    return jsonError("تعذر تحميل سجل القرارات.", 500);
  }
}
