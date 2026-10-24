import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { jsonError, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  await destroySession();
  return NextResponse.json({ ok: true, redirect: "/" });
}
