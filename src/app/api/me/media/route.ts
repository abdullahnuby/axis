import { NextResponse } from "next/server";
import sharp from "sharp";
import { query } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { parseSafeUpload } from "@/lib/upload";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
type MediaKind = "avatar" | "cover";
function validKind(value: string | null): value is MediaKind { return value === "avatar" || value === "cover"; }

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  if (await consumeRateLimit("profile-media-upload", `${requestIpKey(request)}:${user!.id}`, { limit: 12, windowMinutes: 60, blockMinutes: 30 })) {
    return jsonError("غيّرت الصور مرات كتير في وقت قصير. جرّب بعد شوية.", 429);
  }
  let form: FormData;
  try { form = await request.formData(); } catch { return jsonError("بيانات الصورة غير صالحة."); }
  const kindValue = form.get("kind");
  const kind = typeof kindValue === "string" ? kindValue : null;
  if (!validKind(kind)) return jsonError("اختار صورة شخصية أو صورة غلاف.");
  let image: Awaited<ReturnType<typeof parseSafeUpload>>;
  try {
    image = await parseSafeUpload(form.get("file"), { allowPdf: false, maxBytes: kind === "cover" ? 4_000_000 : 2_000_000 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "الصورة غير صالحة.");
  }
  if (!image) return jsonError("اختار صورة الأول.");
  let optimizedBuffer: Buffer;
  try {
    optimizedBuffer = await sharp(image.buffer, { limitInputPixels: 30_000_000 })
      .rotate()
      .resize({
        width: kind === "cover" ? 1800 : 720,
        height: kind === "cover" ? 900 : 720,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 84, effort: 4 })
      .toBuffer();
  } catch {
    return jsonError("الصورة مش قابلة للمعالجة. جرّب صورة JPG أو PNG أو WebP مختلفة.", 400);
  }
  try {
    if (kind === "avatar") {
      await query("UPDATE users SET avatar_image_data=$1,avatar_image_mime='image/webp',updated_at=now() WHERE id=$2", [optimizedBuffer, user!.id]);
    } else {
      await query("UPDATE users SET cover_image_data=$1,cover_image_mime='image/webp',updated_at=now() WHERE id=$2", [optimizedBuffer, user!.id]);
    }
    const status = await query<{ has_avatar: boolean; has_cover: boolean; updated_at: string }>(
      "SELECT avatar_image_mime IS NOT NULL AS has_avatar,cover_image_mime IS NOT NULL AS has_cover,updated_at FROM users WHERE id=$1",
      [user!.id],
    );
    return NextResponse.json({ ok: true, kind, ...status.rows[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AXIS profile media upload error", (error as { code?: string })?.code || "database_error");
    return jsonError("ما قدرناش نحفظ الصورة دلوقتي. جرّب تاني.", 500);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;
  const kind = new URL(request.url).searchParams.get("kind");
  if (!validKind(kind)) return jsonError("نوع الصورة غير صالح.");
  try {
    if (kind === "avatar") {
      await query("UPDATE users SET avatar_image_data=NULL,avatar_image_mime=NULL,updated_at=now() WHERE id=$1", [user!.id]);
    } else {
      await query("UPDATE users SET cover_image_data=NULL,cover_image_mime=NULL,updated_at=now() WHERE id=$1", [user!.id]);
    }
    const status = await query<{ has_avatar: boolean; has_cover: boolean; updated_at: string }>(
      "SELECT avatar_image_mime IS NOT NULL AS has_avatar,cover_image_mime IS NOT NULL AS has_cover,updated_at FROM users WHERE id=$1",
      [user!.id],
    );
    return NextResponse.json({ ok: true, kind, ...status.rows[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AXIS profile media delete error", (error as { code?: string })?.code || "database_error");
    return jsonError("ما قدرناش نشيل الصورة دلوقتي. جرّب تاني.", 500);
  }
}
