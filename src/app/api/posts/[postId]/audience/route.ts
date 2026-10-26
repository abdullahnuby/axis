import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ postId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type AudienceTarget = { id: string; group_id: string | null; access_level: "verified" | "members" };

export async function PATCH(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("الطلب مرفوض. حدّث الصفحة وجرب تاني.", 403);
  const { user, response } = await getApiUser({ admin: true });
  if (response) return response;
  if (user!.role !== "admin") return jsonError("تغيير جمهور المنشور من صلاحية الأدمن فقط.", 403);

  const { postId } = await context.params;
  if (!UUID.test(postId)) return jsonError("المنشور غير صالح.", 400);

  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return jsonError("بيانات غير صالحة."); }
  const requested = input.accessLevel;
  if (requested !== "verified" && requested !== "members") {
    return jsonError("اختيار جمهور المنشور غير صالح.", 400);
  }

  if (await consumeRateLimit("post-audience-change", `${requestIpKey(request)}:${user!.id}`, { limit: 60, windowMinutes: 10, blockMinutes: 10 })) {
    return jsonError("تم تغيير جمهور منشورات كتير في وقت قصير. جرّب بعد شوية.", 429);
  }

  try {
    const result = await withTransaction(async client => {
      const locked = await client.query<AudienceTarget>(
        "SELECT id,group_id,access_level FROM posts WHERE id=$1 FOR UPDATE",
        [postId],
      );
      const post = locked.rows[0];
      if (!post) throw Object.assign(new Error("المنشور مش موجود أو اتحذف."), { statusCode: 404 });
      if (post.group_id) throw Object.assign(new Error("منشورات الجروبات بتتدار من إعدادات الجروب، مش من معاينة المجتمع."), { statusCode: 400 });
      if (post.access_level === requested) return { access_level: post.access_level, changed: false };

      const updated = await client.query<{ access_level: "verified" | "members" }>(
        "UPDATE posts SET access_level=$1,updated_at=now() WHERE id=$2 AND group_id IS NULL RETURNING access_level",
        [requested, postId],
      );
      if (!updated.rows[0]) throw Object.assign(new Error("ما قدرناش نحدّث جمهور المنشور."), { statusCode: 404 });
      await client.query(
        "INSERT INTO audit_logs(actor_id,action,target_type,target_id,metadata) VALUES($1,$2,$3,$4,$5::jsonb)",
        [user!.id, "post_audience_changed", "post", postId, JSON.stringify({ from: post.access_level, to: requested })],
      );
      return { access_level: updated.rows[0].access_level, changed: true };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    if (statusCode >= 500) console.error("AXIS post audience update error", (error as { code?: string })?.code || "database_error");
    return jsonError(error instanceof Error ? error.message : "ما قدرناش نغيّر جمهور المنشور دلوقتي.", statusCode);
  }
}
