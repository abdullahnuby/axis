import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ postId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type PinTarget = { id: string; author_id: string; group_id: string | null; group_owner_id: string | null };

export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("الطلب مرفوض. حدّث الصفحة وجرب تاني.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;

  const { postId } = await context.params;
  if (!UUID.test(postId)) return jsonError("البوست غير صالح.", 400);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return jsonError("الطلب غير صالح."); }
  if (typeof input.pinned !== "boolean") return jsonError("اختار تثبيت البوست أو إلغاء تثبيته.");

  if (await consumeRateLimit("pin-post", `${requestIpKey(request)}:${user!.id}`, { limit: 30, windowMinutes: 10, blockMinutes: 10 })) {
    return jsonError("محاولات تثبيت كتير في وقت قصير. جرّب بعد شوية.", 429);
  }

  try {
    const targetResult = await query<PinTarget>(
      `SELECT p.id,p.author_id,p.group_id,g.created_by AS group_owner_id
         FROM posts p LEFT JOIN engineering_groups g ON g.id=p.group_id
        WHERE p.id=$1`,
      [postId],
    );
    const target = targetResult.rows[0];
    if (!target) return jsonError("البوست مش موجود أو اتحذف.", 404);

    if (target.group_id) {
      if (target.group_owner_id !== user!.id && !["admin", "moderator"].includes(user!.role)) {
        return jsonError("تثبيت بوستات الجروب من صلاحية صاحب الجروب أو الإشراف.", 403);
      }
    } else if (target.author_id !== user!.id) {
      return jsonError("تقدر تثبّت بوستاتك على حسابك أنت بس.", 403);
    }

    const pinnedAt = await withTransaction(async client => {
      const locked = await client.query<{ id: string }>("SELECT id FROM posts WHERE id=$1 FOR UPDATE", [postId]);
      if (!locked.rows[0]) return null;
      if (input.pinned === true) {
        if (target.group_id) {
          await client.query("UPDATE posts SET pinned_at=NULL,updated_at=now() WHERE group_id=$1 AND id<>$2 AND pinned_at IS NOT NULL", [target.group_id, postId]);
        } else {
          await client.query("UPDATE posts SET pinned_at=NULL,updated_at=now() WHERE author_id=$1 AND group_id IS NULL AND id<>$2 AND pinned_at IS NOT NULL", [user!.id, postId]);
        }
      }
      const updated = await client.query<{ pinned_at: string | null }>(
        "UPDATE posts SET pinned_at=CASE WHEN $2::boolean THEN now() ELSE NULL END,updated_at=now() WHERE id=$1 RETURNING pinned_at",
        [postId, input.pinned],
      );
      return updated.rows[0]?.pinned_at ?? null;
    });

    if (input.pinned === true && pinnedAt === null) return jsonError("ما قدرناش نثبّت البوست؛ ممكن يكون اتحذف.", 404);
    return NextResponse.json({ ok: true, pinned: Boolean(pinnedAt), pinned_at: pinnedAt });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") return jsonError("حصل تعارض أثناء التثبيت. حدّث الصفحة وجرب تاني.", 409);
    console.error("AXIS post pin error", code || "database_error");
    return jsonError("ما قدرناش نثبّت البوست دلوقتي. جرّب تاني.", 500);
  }
}
