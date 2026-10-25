import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { cleanText, getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ conversationId: string; messageId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type OwnMessage = { id: string; sender_id: string; body: string; edited_at: string | null };

async function lockOwnMessage(client: import("pg").PoolClient, conversationId: string, messageId: string, userId: string) {
  const result = await client.query<OwnMessage>(
    `SELECT m.id,m.sender_id,m.body,m.edited_at
       FROM messages m
       JOIN conversation_members cm ON cm.conversation_id=m.conversation_id AND cm.user_id=$3
      WHERE m.id=$1 AND m.conversation_id=$2 AND m.deleted_at IS NULL
      FOR UPDATE OF m`,
    [messageId, conversationId, userId],
  );
  return result.rows[0] || null;
}

export async function PATCH(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const { conversationId, messageId } = await context.params;
  if (!UUID.test(conversationId) || !UUID.test(messageId)) return jsonError("المحادثة أو الرسالة غير صالحة.", 400);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return jsonError("بيانات الرسالة غير صالحة."); }
  const body = cleanText(input.body, 5000);
  if (!body) return jsonError("اكتب الرسالة قبل الحفظ.");
  if (await consumeRateLimit("edit-message", `${requestIpKey(request)}:${user!.id}`, { limit: 30, windowMinutes: 10, blockMinutes: 10 })) {
    return jsonError("تعديلات كتير في وقت قصير. جرّب بعد شوية.", 429);
  }
  try {
    const message = await withTransaction(async client => {
      const existing = await lockOwnMessage(client, conversationId, messageId, user!.id);
      if (!existing) throw Object.assign(new Error("الرسالة غير موجودة أو المحادثة لم تعد متاحة."), { statusCode: 404 });
      if (existing.sender_id !== user!.id) throw Object.assign(new Error("تقدر تعدّل رسائلك أنت بس."), { statusCode: 403 });
      const updated = await client.query<{ id: string; body: string; edited_at: string }>(
        "UPDATE messages SET body=$1, edited_at=now() WHERE id=$2 RETURNING id,body,edited_at",
        [body, messageId],
      );
      return updated.rows[0];
    });
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    console.error("AXIS message edit error", (error as { code?: string })?.code || "request_error");
    return jsonError(error instanceof Error ? error.message : "ما قدرناش نحفظ تعديل الرسالة.", status || 500);
  }
}

export async function DELETE(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const { conversationId, messageId } = await context.params;
  if (!UUID.test(conversationId) || !UUID.test(messageId)) return jsonError("المحادثة أو الرسالة غير صالحة.", 400);
  if (await consumeRateLimit("delete-message", `${requestIpKey(request)}:${user!.id}`, { limit: 40, windowMinutes: 10, blockMinutes: 5 })) return jsonError("عمليات حذف الرسائل كتير في وقت قصير. جرّب بعد شوية.", 429);
  try {
    await withTransaction(async client => {
      const existing = await lockOwnMessage(client, conversationId, messageId, user!.id);
      if (!existing) throw Object.assign(new Error("الرسالة غير موجودة أو اتحذفت بالفعل."), { statusCode: 404 });
      if (existing.sender_id !== user!.id) throw Object.assign(new Error("تقدر تحذف رسائلك أنت بس."), { statusCode: 403 });
      await client.query("UPDATE messages SET body='تم حذف الرسالة', deleted_at=now() WHERE id=$1", [messageId]);
      await client.query("UPDATE conversations SET updated_at=now() WHERE id=$1", [conversationId]);
    });
    return NextResponse.json({ ok: true, messageId });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    console.error("AXIS message delete error", (error as { code?: string })?.code || "request_error");
    return jsonError(error instanceof Error ? error.message : "ما قدرناش نحذف الرسالة.", status || 500);
  }
}
