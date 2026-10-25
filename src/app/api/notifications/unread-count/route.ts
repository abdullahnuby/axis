import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  try {
    const result = await query<{ unread_count: number }>(
      "SELECT count(*)::int AS unread_count FROM notifications WHERE user_id=$1 AND is_read=false",
      [user!.id],
    );
    return NextResponse.json(
      { unreadCount: Number(result.rows[0]?.unread_count) || 0 },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("AXIS unread notification count error", (error as { code?: string })?.code || "database_error");
    return jsonError("مش قادرين نحدّث عدّاد الإشعارات دلوقتي.", 500);
  }
}
