import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { createSession } from "@/lib/auth";
import { cleanText, jsonError, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
function clientIp(request: Request): string { return (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 80); }
async function loginBlocked(email: string, ip: string) {
  const r = await query<{ attempts: number; window_started_at: string; blocked_until: string | null }>("SELECT attempts,window_started_at,blocked_until FROM login_attempts WHERE identifier=$1 AND ip_address=$2", ["admin:" + email, ip]);
  const row = r.rows[0];
  return !!row && ((row.blocked_until && new Date(row.blocked_until).getTime() > Date.now()) || (row.attempts >= 8 && Date.now() - new Date(row.window_started_at).getTime() < 15 * 60 * 1000));
}
async function recordFailure(email: string, ip: string) {
  await query(`INSERT INTO login_attempts(identifier,ip_address,attempts,window_started_at,blocked_until) VALUES($1,$2,1,now(),NULL)
    ON CONFLICT(identifier,ip_address) DO UPDATE SET attempts=CASE WHEN login_attempts.window_started_at < now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END,
    window_started_at=CASE WHEN login_attempts.window_started_at < now()-interval '15 minutes' THEN now() ELSE login_attempts.window_started_at END,
    blocked_until=CASE WHEN (CASE WHEN login_attempts.window_started_at < now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END)>=8 THEN now()+interval '15 minutes' ELSE login_attempts.blocked_until END`, ["admin:" + email, ip]);
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return jsonError("بيانات الدخول غير صالحة."); }
  const email = cleanText(body.email, 254).toLowerCase(); const password = typeof body.password === "string" ? body.password : ""; const ip = clientIp(request);
  if (!email || !password) return jsonError("اكتب البريد الإلكتروني وكلمة المرور.");
  try {
    if (await loginBlocked(email, ip)) return jsonError("محاولات كثيرة. انتظر 15 دقيقة ثم حاول مرة أخرى.", 429);
    const result = await query<{ id: string; password_hash: string; role: string; account_status: string }>("SELECT id,password_hash,role,account_status FROM users WHERE email=$1 LIMIT 1", [email]);
    const admin = result.rows[0];
    if (!admin || !(await verifyPassword(password, admin.password_hash)) || !["admin", "reviewer", "moderator"].includes(admin.role) || admin.account_status !== "active") { await recordFailure(email, ip); return jsonError("بيانات الدخول غير صحيحة أو لا توجد صلاحية إدارية.", 401); }
    await query("DELETE FROM login_attempts WHERE identifier=$1 AND ip_address=$2", ["admin:" + email, ip]);
    await createSession(admin.id, false);
    return NextResponse.json({ ok: true, redirect: "/admin" });
  } catch (error) { console.error("AXIS admin login error", (error as { code?: string })?.code || "database_error"); return jsonError("تعذر تسجيل الدخول للإدارة.", 500); }
}
