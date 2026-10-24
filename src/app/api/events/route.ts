import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  const { response } = await getApiUser({ verified: true }); if (response) return response;
  const result = await query("SELECT id,title,description,location,event_url,starts_at FROM events WHERE is_published=true AND (starts_at IS NULL OR starts_at >= now() - interval '30 days') ORDER BY starts_at ASC NULLS LAST,created_at DESC LIMIT 8");
  return NextResponse.json({ events: result.rows });
}
