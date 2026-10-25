import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError } from "@/lib/http";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ userId: string }> };
type MediaKind = "avatar" | "cover";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validKind(value: string | null): value is MediaKind { return value === "avatar" || value === "cover"; }

export async function GET(request: Request, context: Ctx) {
  const { response } = await getApiUser({ verified: true });
  if (response) return response;
  const { userId } = await context.params;
  if (!UUID.test(userId)) return jsonError("الحساب غير صالح.", 400);
  const kindValue = new URL(request.url).searchParams.get("kind");
  if (!validKind(kindValue)) return jsonError("نوع الصورة غير صالح.", 400);
  const dataColumn = kindValue === "avatar" ? "avatar_image_data" : "cover_image_data";
  const mimeColumn = kindValue === "avatar" ? "avatar_image_mime" : "cover_image_mime";
  try {
    const result = await query<{ image_data: Buffer; image_mime: string }>(
      `SELECT ${dataColumn} AS image_data,${mimeColumn} AS image_mime FROM users
        WHERE id=$1 AND account_status='active'
          AND (verification_status='verified' OR role IN ('admin','reviewer','moderator'))
          AND ${dataColumn} IS NOT NULL AND ${mimeColumn} IS NOT NULL LIMIT 1`,
      [userId],
    );
    const media = result.rows[0];
    if (!media) return jsonError("الصورة مش موجودة.", 404);
    const body = new Uint8Array(media.image_data.byteLength);
    body.set(media.image_data);
    return new NextResponse(body.buffer, {
      headers: {
        "Content-Type": media.image_mime,
        "Content-Length": String(media.image_data.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    console.error("AXIS profile media read error", (error as { code?: string })?.code || "database_error");
    return jsonError("مش قادرين نعرض الصورة دلوقتي.", 500);
  }
}
