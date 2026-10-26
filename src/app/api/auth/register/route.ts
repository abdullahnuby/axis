import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, hashToken, randomToken } from "@/lib/crypto";
import { htmlEmail, mailConfigured, sendTransactionalEmail } from "@/lib/mailer";
import { createSession } from "@/lib/auth";
import { cleanText, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError("بيانات التسجيل غير صالحة."); }
  const displayName = cleanText(body.displayName, 80);
  const username = cleanText(body.username, 24).toLowerCase();
  const email = cleanText(body.email, 254).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (displayName.length < 2) return jsonError("اكتب اسم ظهور صحيحًا.");
  if (!/^[a-z0-9_.-]{3,24}$/.test(username)) return jsonError("اسم المستخدم يجب أن يكون من 3 إلى 24 حرفًا إنجليزيًا أو رقمًا أو . _ -.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("اكتب بريدًا إلكترونيًا صحيحًا.");
  if (password.length < 10 || password.length > 128) return jsonError("كلمة المرور يجب أن تكون بين 10 و128 حرفًا.");
  try {
    if (await consumeRateLimit("register", `${requestIpKey(request)}:${email}`, { limit: 6, windowMinutes: 15, blockMinutes: 30 })) return jsonError("محاولات التسجيل كتير في وقت قصير. جرّب بعد شوية.", 429);
    const passwordHash = await hashPassword(password);
    const result = await query<{ id: string }>(
      `INSERT INTO users (email, username, display_name, password_hash, avatar_color)
       VALUES ($1,$2,$3,$4, (ARRAY['#007BFF','#236B6B','#6650A4','#9B5D27'])[floor(random()*4+1)::int])
       RETURNING id`, [email, username, displayName, passwordHash]);
    const userId = result.rows[0].id;
    await createSession(userId, false);
    // Send confirmation automatically when the deployment has email configured.
    // Signup should still succeed if the provider has a transient delivery error.
    if (mailConfigured()) {
      const token = randomToken();
      await query("INSERT INTO email_verification_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '24 hours')", [userId, hashToken(token)]);
      const link = `${process.env.APP_URL!.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
      try {
        await sendTransactionalEmail({ to: email, subject: "أكد بريدك في AXIS", html: htmlEmail("أهلًا بيك في AXIS", "أكد بريدك الإلكتروني علشان نقدر نتواصل معاك بخصوص حسابك.", link, "تأكيد البريد") });
      } catch (mailError) {
        await query("DELETE FROM email_verification_tokens WHERE token_hash=$1", [hashToken(token)]);
        console.error("AXIS registration email delivery failed", (mailError as { code?: string })?.code || "email_error");
      }
    }
    return NextResponse.json({ ok: true, redirect: "/feed" }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") return jsonError("البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل.", 409);
    console.error("AXIS registration error", code || "database_error");
    return jsonError("ما قدرناش ننشئ الحساب دلوقتي. جرّب تاني بعد شوية.", 500);
  }
}
