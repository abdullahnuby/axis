import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/types";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (host && originUrl.host.toLowerCase() === host.toLowerCase()) return true;
    if (process.env.APP_URL) return originUrl.origin === new URL(process.env.APP_URL).origin;
    return false;
  } catch {
    return false;
  }
}

export async function getApiUser(options: { verified?: boolean; admin?: boolean } = {}): Promise<{ user: SessionUser | null; response?: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: jsonError("سجّل الدخول أولًا.", 401) };
  if (user.account_status !== "active") return { user: null, response: jsonError("هذا الحساب موقوف حاليًا.", 403) };
  if (options.admin && !["admin", "reviewer", "moderator"].includes(user.role)) {
    return { user: null, response: jsonError("ليس لديك صلاحية الوصول إلى هذه الصفحة.", 403) };
  }
  if (options.verified && user.verification_status !== "verified" && !["admin", "reviewer", "moderator"].includes(user.role)) {
    return { user: null, response: jsonError("يجب اعتماد العضوية الهندسية أولًا.", 403) };
  }
  return { user };
}

export function cleanText(input: unknown, maxLength: number): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength);
}

export function allowedImage(file: File): boolean {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= 2_000_000;
}
