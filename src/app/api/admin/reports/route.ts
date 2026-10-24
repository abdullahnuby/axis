import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  const { user, response } = await getApiUser({ admin: true }); if (response) return response;
  if (!["admin", "moderator"].includes(user!.role)) return jsonError("لا تملك صلاحية إدارة البلاغات.", 403);
  const result = await query(`SELECT r.id,r.target_type,r.target_id,r.reason,r.status,r.created_at,u.display_name AS reporter,
    CASE WHEN r.target_type='post' THEN (SELECT left(body,180) FROM posts WHERE id=r.target_id)
         WHEN r.target_type='comment' THEN (SELECT left(body,180) FROM comments WHERE id=r.target_id)
         WHEN r.target_type='user' THEN (SELECT display_name FROM users WHERE id=r.target_id) END AS target_summary
    FROM reports r JOIN users u ON u.id=r.reporter_id ORDER BY (r.status='open') DESC,r.created_at DESC LIMIT 200`);
  return NextResponse.json({ reports: result.rows });
}
