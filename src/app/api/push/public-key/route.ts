import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push";

export const runtime = "nodejs";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "إشعارات الهاتف لم تُجهّز على الخادم بعد." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ publicKey }, { headers: { "Cache-Control": "no-store" } });
}
