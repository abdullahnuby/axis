import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/types";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function sameOrigin(request: Request): boolean {
  try {
    const trustedOrigins = new Set<string>();
    const addOrigin = (value: string | null | undefined) => {
      if (!value) return;
      try {
        const parsed = new URL(value.includes("://") ? value : `https://${value}`);
        trustedOrigins.add(parsed.origin.toLowerCase());
      } catch {
        // Ignore malformed proxy/config values and keep checking known origins.
      }
    };

    // Stable Vercel aliases and proxy headers can differ. Match any trusted
    // origin instead of rejecting a legitimate mutation on one of our aliases.
    addOrigin(process.env.APP_URL);
    addOrigin(new URL(request.url).origin);
    const requestProtocol = (request.headers.get("x-forwarded-proto") ||
      new URL(request.url).protocol.replace(":", "")).split(",")[0].trim();
    for (const hostHeader of [request.headers.get("x-forwarded-host"), request.headers.get("host")]) {
      for (const host of (hostHeader || "").split(",")) {
        const normalizedHost = host.trim();
        if (normalizedHost) addOrigin(`${requestProtocol}://${normalizedHost}`);
      }
    }

    const origin = request.headers.get("origin");
    if (origin) return trustedOrigins.has(new URL(origin).origin.toLowerCase());

    // Some mobile browser contexts omit Origin. Only accept a matching Referer
    // as a fallback; do not allow state-changing requests with neither header.
    const referer = request.headers.get("referer");
    return referer ? trustedOrigins.has(new URL(referer).origin.toLowerCase()) : false;
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
