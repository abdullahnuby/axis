import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { jsonError, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  let input: Record<string, unknown>; try { input = await request.json(); } catch { return jsonError("رابط التأكيد غير صالح."); }
  const token = typeof input.token === "string" ? input.token.trim() : "";
  if (token.length < 32 || token.length > 160) return jsonError("رابط التأكيد غير صالح أو انتهت صلاحيته.");
  try {
    await withTransaction(async client => {
      const found = await client.query<{ user_id: string }>("SELECT user_id FROM email_verification_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE", [hashToken(token)]);
      if (!found.rows[0]) throw Object.assign(new Error("رابط التأكيد غير صالح أو انتهت صلاحيته."), { statusCode: 400 });
      await client.query("UPDATE users SET email_verified_at=now(),updated_at=now() WHERE id=$1", [found.rows[0].user_id]);
      await client.query("UPDATE email_verification_tokens SET used_at=now() WHERE token_hash=$1", [hashToken(token)]);
    });
    return NextResponse.json({ ok: true, message: "تم تأكيد بريدك الإلكتروني بنجاح." });
  } catch (error) { return jsonError(error instanceof Error ? error.message : "تعذر تأكيد البريد.", (error as { statusCode?: number }).statusCode || 500); }
}
