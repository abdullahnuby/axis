import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError } from "@/lib/http";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ postId: string }> };
export async function GET(_request: Request, context: Ctx) {
  const { user, response } = await getApiUser({ verified: true }); if (response) return response;
  const { postId } = await context.params;
  const result = await query<{ image_data: Buffer; image_mime: string; image_name: string | null }>(`SELECT p.image_data,p.image_mime,p.image_name FROM posts p JOIN users u ON u.id=p.author_id LEFT JOIN engineering_groups g ON g.id=p.group_id
    WHERE p.id=$1 AND p.image_data IS NOT NULL AND u.verification_status='verified' AND u.account_status='active'
      AND (p.group_id IS NULL OR g.visibility='public' OR EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id=p.group_id AND gm.user_id=$2 AND gm.status='active'))`, [postId,user!.id]);
  const image = result.rows[0]; if (!image) return jsonError("الصورة غير موجودة.", 404);
  // Copy the Node Buffer into a fresh Uint8Array backed by an ArrayBuffer.
  // This avoids the Buffer<ArrayBufferLike> vs Web BodyInit type mismatch.
  const body = new Uint8Array(image.image_data.byteLength);
  body.set(image.image_data);
  return new NextResponse(body.buffer, { headers: { "Content-Type": image.image_mime, "Content-Length": String(image.image_data.length), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
}
