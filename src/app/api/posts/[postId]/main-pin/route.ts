import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ postId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PinTarget = { id: string; group_id: string | null };

export async function POST(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("الطلب مرفوض. حدّث الصفحة وجرب تاني.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  if (user!.role !== "admin") return jsonError("تثبيت البوستات في الرئيسية من صلاحية الأدمن فقط.", 403);

  const { postId } = await context.params;
  if (!UUID.test(postId)) return jsonError("البوست غير صالح.", 400);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return jsonError("الطلب غير صالح."); }
  if (typeof input.pinned !== "boolean") return jsonError("اختار تثبيت البوست أو إلغاء تثبيته.");

  if (await consumeRateLimit("main-feed-pin", `${requestIpKey(request)}:${user!.id}`, { limit: 20, windowMinutes: 10, blockMinutes: 10 })) {
    return jsonError("محاولات تثبيت كتير في وقت قصير. جرّب بعد شوية.", 429);
  }

  try {
    const targetResult = await query<PinTarget>("SELECT id,group_id FROM posts WHERE id=$1", [postId]);
    const target = targetResult.rows[0];
    if (!target) return jsonError("البوست مش موجود أو اتحذف.", 404);
    if (target.group_id) return jsonError("بوستات الجروبات بتتدار من داخل الجروب، مش من الرئيسية.", 400);

    const pinnedAt = await withTransaction(async client => {
      const locked = await client.query<{ id: string; group_id: string | null }>(
        "SELECT id,group_id FROM posts WHERE id=$1 FOR UPDATE",
        [postId],
      );
      if (!locked.rows[0] || locked.rows[0].group_id) return null;
      if (input.pinned === true) {
        await client.query(
          "UPDATE posts SET main_feed_pinned_at=NULL,main_feed_pinned_by=NULL WHERE main_feed_pinned_at IS NOT NULL AND id<>$1",
          [postId],
        );
      }
      const updated = await client.query<{ main_feed_pinned_at: string | null }>(
        "UPDATE posts SET main_feed_pinned_at=CASE WHEN $2::boolean THEN now() ELSE NULL END,main_feed_pinned_by=CASE WHEN $2::boolean THEN $3::uuid ELSE NULL END WHERE id=$1 AND group_id IS NULL RETURNING main_feed_pinned_at",
        [postId, input.pinned, user!.id],
      );
      return updated.rows[0]?.main_feed_pinned_at ?? null;
    });

    if (!pinnedAt && input.pinned) return jsonError("ما قدرناش نثبت البوست؛ ممكن يكون اتحذف.", 404);
    return NextResponse.json({ ok: true, pinned: Boolean(pinnedAt), main_feed_pinned_at: pinnedAt });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") return jsonError("في بوست مثبت بالفعل أثناء تنفيذ الطلب. حدّث الصفحة وجرب تاني.", 409);
    console.error("AXIS main feed pin error", code || "database_error");
    return jsonError("ما قدرناش نثبت البوست في الرئيسية دلوقتي. جرّب تاني.", 500);
  }
}
