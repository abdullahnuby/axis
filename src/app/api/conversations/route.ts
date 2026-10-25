import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function GET() {
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  try {
    const result = await query(`SELECT c.id,c.updated_at,other.id AS other_user_id,other.username AS other_username,
      other.display_name AS other_display_name,other.avatar_color AS other_avatar_color,(other.avatar_image_mime IS NOT NULL) AS other_has_avatar,other.specialty AS other_specialty,
      last.body AS last_message,last.created_at AS last_message_at,last.sender_id AS last_sender_id,
      (SELECT count(*)::int FROM messages unread WHERE unread.conversation_id=c.id AND unread.sender_id<>$1 AND unread.created_at>mine.last_read_at AND unread.deleted_at IS NULL) AS unread_count
      FROM conversations c
      JOIN conversation_members mine ON mine.conversation_id=c.id AND mine.user_id=$1
      JOIN conversation_members other_member ON other_member.conversation_id=c.id AND other_member.user_id<>$1
      JOIN users other ON other.id=other_member.user_id
      LEFT JOIN LATERAL (SELECT m.body,m.created_at,m.sender_id FROM messages m WHERE m.conversation_id=c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) last ON true
      WHERE other.account_status='active'
      ORDER BY COALESCE(last.created_at,c.updated_at) DESC LIMIT 80`, [user!.id]);
    return NextResponse.json({ conversations: result.rows });
  } catch (error) { console.error("AXIS conversations list error", (error as { code?: string })?.code || "database_error"); return jsonError("مش قادرين نحمّل رسايلك دلوقتي.", 500); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  let input: Record<string, unknown>; try { input = await request.json(); } catch { return jsonError("بيانات المحادثة غير صالحة."); }
  const targetId = typeof input.userId === "string" ? input.userId : "";
  if (!UUID.test(targetId)) return jsonError("المهندس المراد مراسلته غير صالح.", 400);
  if (targetId === user!.id) return jsonError("مش ممكن تبعت رسالة لنفسك.", 400);
  try {
    const conversation = await withTransaction(async client => {
      const target = await client.query("SELECT id FROM users WHERE id=$1 AND account_status='active' AND (verification_status='verified' OR role IN ('admin','reviewer','moderator'))", [targetId]);
      if (!target.rows[0]) throw Object.assign(new Error("الحساب غير موجود أو غير متاح للمراسلة."), { statusCode: 404 });
      const directKey = [user!.id, targetId].sort().join(":");
      const created = await client.query(`INSERT INTO conversations(direct_key,created_by) VALUES($1,$2)
        ON CONFLICT(direct_key) DO UPDATE SET updated_at=now() RETURNING id`, [directKey,user!.id]);
      const id = created.rows[0].id as string;
      await client.query("INSERT INTO conversation_members(conversation_id,user_id) VALUES($1,$2),($1,$3) ON CONFLICT DO NOTHING", [id,user!.id,targetId]);
      return { id };
    });
    return NextResponse.json({ conversationId: conversation.id, redirect: `/messages/${conversation.id}` }, { status: 201 });
  } catch (error) { return jsonError(error instanceof Error ? error.message : "ما قدرناش نبدأ المحادثة دلوقتي.", (error as { statusCode?: number }).statusCode || 500); }
}
