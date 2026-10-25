import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

type SubscriptionInput = {
  endpoint?: unknown;
  expirationTime?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

function allowedEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || value.length > 4096) return false;
    const host = url.hostname.toLowerCase();
    return host === "fcm.googleapis.com" ||
      host === "push.services.mozilla.com" ||
      host.endsWith(".push.services.mozilla.com") ||
      host.endsWith(".push.apple.com") ||
      host.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser();
  if (response) return response;
  let input: SubscriptionInput;
  try { input = await request.json() as SubscriptionInput; } catch { return jsonError("بيانات الإشعارات غير صالحة."); }

  const endpoint = typeof input.endpoint === "string" ? input.endpoint : "";
  const p256dh = typeof input.keys?.p256dh === "string" ? input.keys.p256dh : "";
  const auth = typeof input.keys?.auth === "string" ? input.keys.auth : "";
  if (!allowedEndpoint(endpoint)) return jsonError("عنوان خدمة الإشعارات غير صالح.");
  if (Buffer.from(p256dh, "base64url").length !== 65 || Buffer.from(auth, "base64url").length < 16 || Buffer.from(auth, "base64url").length > 32) {
    return jsonError("مفاتيح الإشعارات غير صالحة.");
  }

  const expirationTime = typeof input.expirationTime === "number" && Number.isFinite(input.expirationTime)
    ? Math.trunc(input.expirationTime) : null;
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 300);
  try {
    const saved = await query(
      `INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth,expiration_time,user_agent)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(endpoint) DO UPDATE SET p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,
         expiration_time=EXCLUDED.expiration_time,user_agent=EXCLUDED.user_agent,updated_at=now()
       WHERE push_subscriptions.user_id=EXCLUDED.user_id
       RETURNING id`,
      [user!.id, endpoint, p256dh, auth, expirationTime, userAgent],
    );
    if (!saved.rows.length) return jsonError("هذا الجهاز مرتبط بحساب آخر. ألغِ الاشتراك القديم أولًا.", 409);
    return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AXIS push subscription save failed", (error as { code?: string })?.code || "database_error");
    return jsonError("ما قدرناش نحفظ إعداد إشعارات الموبايل. جرّب تاني.", 500);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser();
  if (response) return response;
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return jsonError("بيانات الإشعارات غير صالحة."); }
  const endpoint = typeof input.endpoint === "string" ? input.endpoint : "";
  if (!allowedEndpoint(endpoint)) return jsonError("عنوان خدمة الإشعارات غير صالح.");
  try {
    await query("DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2", [user!.id, endpoint]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("AXIS push subscription removal failed", (error as { code?: string })?.code || "database_error");
    return jsonError("ما قدرناش نوقف إشعارات هذا الجهاز. جرّب تاني.", 500);
  }
}
