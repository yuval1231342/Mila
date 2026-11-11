import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { q, q1 } from "./db";
import { newToken, hmac, hashIp } from "./crypto";
import { HttpError } from "./http";

export const COOKIE = "mila_session";
const SESSION_DAYS = 30;

export type User = {
  id: string; email: string; display_name: string | null; locale: "he" | "en";
  role: "user" | "support" | "compliance" | "admin" | "super_admin"; status: string; email_verified_at: string | null;
};

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

export function passwordPolicyError(p: string): string | null {
  if (p.length < 10) return "Password must be at least 10 characters";
  if (!/[a-zA-Z]/.test(p) || !/[0-9]/.test(p)) return "Password must include letters and digits";
  return null;
}

export async function createSession(userId: string, ip: string, ua: string | null) {
  const token = newToken();
  await q(
    `INSERT INTO sessions(user_id, token_hash, ip_hash, user_agent, expires_at)
     VALUES ($1,$2,$3,$4, now() + ($5 || ' days')::interval)`,
    [userId, hmac(token), hashIp(ip), ua?.slice(0, 300) ?? null, String(SESSION_DAYS)]);
  cookies().set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: SESSION_DAYS * 86400
  });
}

export async function currentUser(): Promise<User | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  return q1<User>(
    `SELECT u.id,u.email,u.display_name,u.locale,u.role,u.status,u.email_verified_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status='active' AND u.deleted_at IS NULL`,
    [hmac(token)]);
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "unauthenticated", "Sign in required");
  return u;
}
const ADMIN_ROLES = ["support", "compliance", "admin", "super_admin"];
export async function requireRole(...roles: User["role"][]): Promise<User> {
  const u = await requireUser();
  if (!roles.includes(u.role)) throw new HttpError(403, "forbidden", "Not allowed");
  return u;
}
export const isStaff = (u: User) => ADMIN_ROLES.includes(u.role);

export async function destroySession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) await q(`UPDATE sessions SET revoked_at=now() WHERE token_hash=$1`, [hmac(token)]);
  cookies().delete(COOKIE);
}
