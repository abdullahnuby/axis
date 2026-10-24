import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ postId: string }> };
export async function DELETE(request: Request, context: Ctx) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  const { postId } = await context.params;
  const result = await query("DELETE FROM posts WHERE id=$1 AND (author_id=$2 OR $3 IN ('admin','moderator')) RETURNING id", [postId, user!.id, user!.role]);
  if (!result.rows.length) return jsonError("المنشور غير موجود أو لا تملك صلاحية حذفه.", 404);
  return NextResponse.json({ ok: true });
}
