import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { hashPassword, hashToken, verifyPassword } from "@/lib/crypto";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ verified: true });
  if (response) return response;

  let input: Record<string, unknown>;
  try {
    input = await request.json() as Record<string, unknown>;
  } catch {
    return jsonError("بيانات كلمة المرور غير صالحة.");
  }

  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";
  if (!currentPassword || !newPassword) return jsonError("اكتب كلمة المرور الحالية والجديدة.");
  if (newPassword.length < 12 || newPassword.length > 128) {
    return jsonError("كلمة المرور الجديدة لازم تكون من 12 إلى 128 حرفًا.");
  }

  try {
    if (await consumeRateLimit("account-password-change", `${requestIpKey(request)}:${user!.id}`, {
      limit: 5,
      windowMinutes: 15,
      blockMinutes: 30,
    })) {
      return jsonError("محاولات كثيرة لتغيير كلمة المرور. جرّب بعد 30 دقيقة.", 429);
    }

    const found = await query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id=$1 LIMIT 1",
      [user!.id],
    );
    const currentHash = found.rows[0]?.password_hash;
    if (!currentHash || !(await verifyPassword(currentPassword, currentHash))) {
      return jsonError("كلمة المرور الحالية غير صحيحة.", 400);
    }
    if (currentPassword === newPassword) {
      return jsonError("اختار كلمة مرور مختلفة عن الحالية.");
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionToken) return jsonError("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.", 401);
    const sessionHash = hashToken(sessionToken);
    const nextHash = await hashPassword(newPassword);

    await withTransaction(async (client) => {
      const updated = await client.query(
        "UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2 AND password_hash=$3",
        [nextHash, user!.id, currentHash],
      );
      if (updated.rowCount !== 1) {
        throw Object.assign(new Error("بيانات الحساب اتغيّرت. حدّث الصفحة وجرّب تاني."), { statusCode: 409 });
      }
      await client.query(
        "DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2",
        [user!.id, sessionHash],
      );
    });

    return NextResponse.json(
      { ok: true, message: "اتغيّرت كلمة المرور، وتم إنهاء الجلسات الأخرى لحماية حسابك." },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const statusCode = (error as { statusCode?: number })?.statusCode || 500;
    if (statusCode !== 500) return jsonError(error instanceof Error ? error.message : "ما قدرناش نغيّر كلمة المرور.", statusCode);
    console.error("AXIS account password change failed", (error as { code?: string })?.code || "password_change_error");
    return jsonError("ما قدرناش نغيّر كلمة المرور دلوقتي. جرّب تاني.", 500);
  }
}
