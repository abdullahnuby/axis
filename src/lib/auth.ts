import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { hashToken, randomToken } from "@/lib/crypto";
import type { SessionUser } from "@/lib/types";

export const SESSION_COOKIE = "axis_session";
const REMEMBER_SESSION_DAYS = 30;
const BROWSER_SESSION_HOURS = 24;

async function loadCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await query<SessionUser>(
    `SELECT u.id, u.email, u.username, u.display_name, u.role, u.verification_status,
            u.account_status, u.specialty, u.bio, u.job_title, u.approved_years,
            u.seniority_code, u.verified_badges, u.avatar_color, u.avatar_image_mime IS NOT NULL AS has_avatar,
            u.cover_image_mime IS NOT NULL AS has_cover, u.created_at, u.updated_at, u.email_verified_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()
      LIMIT 1`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}

/** Memoised per request, so the shared layout and the page itself cost one session lookup, not two. */
export const getCurrentUser = cache(loadCurrentUser);

export async function createSession(userId: string, rememberMe = false): Promise<void> {
  const token = randomToken();
  const expiresAtInterval = rememberMe ? `${REMEMBER_SESSION_DAYS} days` : `${BROWSER_SESSION_HOURS} hours`;
  await query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + $3::interval)", [userId, hashToken(token), expiresAtInterval]);
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(rememberMe ? { maxAge: REMEMBER_SESSION_DAYS * 24 * 60 * 60 } : {}),
  };
  // Without maxAge/expires the browser receives a session cookie and should clear it when closed.
  cookieStore.set(SESSION_COOKIE, token, cookieOptions);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  // Clear the browser credential first so a database outage cannot leave this device signed in.
  cookieStore.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

export async function requireVerifiedPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.account_status !== "active") redirect("/login?status=suspended");
  if (user.verification_status !== "verified" && !["admin", "reviewer", "moderator"].includes(user.role)) redirect("/verification");
  return user;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.account_status !== "active" || !["admin", "reviewer", "moderator"].includes(user.role)) redirect("/admin/login?error=forbidden");
  return user;
}
