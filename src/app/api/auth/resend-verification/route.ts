import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashToken, randomToken } from "@/lib/crypto";
import { htmlEmail, mailConfigured, sendTransactionalEmail } from "@/lib/mailer";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser(); if (response) return response;
  if (user!.email_verified_at) return NextResponse.json({ ok: true, message: "بريدك متأكد بالفعل." });
  if (await consumeRateLimit("email-verification", `${requestIpKey(request)}:${user!.id}`, { limit: 3, windowMinutes: 60, blockMinutes: 60 })) return jsonError("طلبت روابط تأكيد كتير. جرّب بعد ساعة.", 429);
  if (!mailConfigured()) return jsonError("تأكيد البريد مش مفعّل بعد. أضف RESEND_API_KEY وEMAIL_FROM وAPP_URL في Vercel.", 503);
  const token = randomToken();
  await query("UPDATE email_verification_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL", [user!.id]);
  await query("INSERT INTO email_verification_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '24 hours')", [user!.id, hashToken(token)]);
  const link = `${process.env.APP_URL!.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
  try {
    await sendTransactionalEmail({ to: user!.email, subject: "تأكيد بريدك في AXIS", html: htmlEmail("أكد بريدك الإلكتروني", "اضغط على الرابط لتأكيد أن البريد ده يخصك.", link, "تأكيد البريد") });
    return NextResponse.json({ ok: true, message: "بعتنالك رسالة تأكيد. راجع صندوق الوارد والـ Spam." });
  } catch (error) {
    await query("DELETE FROM email_verification_tokens WHERE token_hash=$1", [hashToken(token)]);
    return jsonError(error instanceof Error ? error.message : "تعذر إرسال رسالة التأكيد.", 503);
  }
}
