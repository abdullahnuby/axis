import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { hashToken, randomToken } from "@/lib/crypto";
import type { SessionUser } from "@/lib/types";

export const SESSION_COOKIE = "axis_session";
const SESSION_DAYS = 7;

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await query<SessionUser>(
    `SELECT u.id, u.email, u.username, u.display_name, u.role, u.verification_status,
            u.account_status, u.specialty, u.bio, u.job_title, u.approved_years,
            u.seniority_code, u.verified_badges, u.avatar_color, u.created_at, u.email_verified_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()
      LIMIT 1`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  await query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '7 days')", [userId, hashToken(token)]);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  cookieStore.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
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
