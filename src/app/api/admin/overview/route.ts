import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  const { response } = await getApiUser({ admin: true }); if (response) return response;
  try {
    const result = await query<{ pending: number; verified: number; members: number; open_reports: number; posts: number }>(`SELECT
      (SELECT count(*)::int FROM verification_requests WHERE status IN ('pending','needs_info')) AS pending,
      (SELECT count(*)::int FROM users WHERE verification_status='verified' AND role='member') AS verified,
      (SELECT count(*)::int FROM users WHERE role='member') AS members,
      (SELECT count(*)::int FROM reports WHERE status='open') AS open_reports,
      (SELECT count(*)::int FROM posts) AS posts`);
    const row = result.rows[0]; return NextResponse.json({ overview: { pending: row.pending, verified: row.verified, members: row.members, openReports: row.open_reports, posts: row.posts } });
  } catch (error) { console.error("AXIS admin overview error", (error as { code?: string })?.code || "database_error"); return jsonError("تعذر تحميل لوحة التحكم.", 500); }
}
