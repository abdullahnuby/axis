import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, cleanText, jsonError, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  const { user, response } = await getApiUser({ admin: true }); if (response) return response;
  if (!["admin", "moderator"].includes(user!.role)) return jsonError("لا تملك صلاحية إدارة الأحداث.", 403);
  const result = await query("SELECT id,title,description,location,event_url,starts_at,is_published FROM events ORDER BY created_at DESC LIMIT 100");
  return NextResponse.json({ events: result.rows });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser({ admin: true }); if (response) return response;
  if (!["admin", "moderator"].includes(user!.role)) return jsonError("لا تملك صلاحية إدارة الأحداث.", 403);
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return jsonError("بيانات الحدث غير صالحة."); }
  const title = cleanText(body.title, 160); const description = cleanText(body.description, 1000) || null; const location = cleanText(body.location, 200) || null; const eventUrl = cleanText(body.event_url, 500) || null; const startsAt = cleanText(body.starts_at, 40) || null;
  if (title.length < 3) return jsonError("عنوان الحدث قصير جدًا.");
  if (eventUrl) { try { const u = new URL(eventUrl); if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error(); } catch { return jsonError("رابط الحدث غير صالح."); } }
  const date = startsAt ? new Date(startsAt) : null; if (date && Number.isNaN(date.getTime())) return jsonError("موعد الحدث غير صالح.");
  const result = await query("INSERT INTO events(title,description,location,event_url,starts_at,is_published,created_by) VALUES($1,$2,$3,$4,$5,true,$6) RETURNING id,title,description,location,event_url,starts_at,is_published", [title, description, location, eventUrl, date, user!.id]);
  await query("INSERT INTO audit_logs(actor_id,action,target_type,target_id,metadata) VALUES($1,'event_created','event',$2,'{}'::jsonb)", [user!.id, result.rows[0].id]);
  return NextResponse.json({ event: result.rows[0] }, { status: 201 });
}
