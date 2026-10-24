import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  try {
    const result = await query(`SELECT n.id,n.kind,n.message,n.target_post_id,n.target_comment_id,n.target_conversation_id,n.target_group_id,n.target_user_id,n.is_read,n.created_at,
      a.display_name AS actor_name,a.username AS actor_username
      FROM notifications n LEFT JOIN users a ON a.id=n.actor_id WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT 100`, [user!.id]);
    return NextResponse.json({ notifications: result.rows });
  } catch (error) { console.error("AXIS notification list error",(error as {code?:string})?.code||"database_error"); return jsonError("مش قادرين نحمّل الإشعارات دلوقتي.",500); }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return jsonError("بيانات غير صالحة."); }
  if (body.markAllRead === true) await query("UPDATE notifications SET is_read=true WHERE user_id=$1 AND is_read=false", [user!.id]);
  else if (typeof body.id === "string") await query("UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2", [body.id, user!.id]);
  else return jsonError("حدد الإشعار المراد تحديثه.");
  return NextResponse.json({ ok: true });
}
