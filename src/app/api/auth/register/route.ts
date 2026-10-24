import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { createSession } from "@/lib/auth";
import { cleanText, jsonError, sameOrigin } from "@/lib/http";

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
    const passwordHash = await hashPassword(password);
    const result = await query<{ id: string }>(
      `INSERT INTO users (email, username, display_name, password_hash, avatar_color)
       VALUES ($1,$2,$3,$4, (ARRAY['#1B4F8F','#236B6B','#6650A4','#9B5D27'])[floor(random()*4+1)::int])
       RETURNING id`, [email, username, displayName, passwordHash]);
    await createSession(result.rows[0].id);
    return NextResponse.json({ ok: true, redirect: "/verification" }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") return jsonError("البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل.", 409);
    console.error("AXIS registration error", code || "database_error");
    return jsonError("تعذر إنشاء الحساب حاليًا. تأكد من إعداد قاعدة البيانات وحاول مرة أخرى.", 500);
  }
}
