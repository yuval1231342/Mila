import { z } from "zod";
import { body, handler, json, HttpError, clientIp } from "@/lib/http";
import { q1 } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const schema = z.object({ email: z.string().email(), password: z.string().max(200) });
// Fixed hash so unknown-email timing resembles a real check.
const DUMMY = "$2a$12$BqvRzM8Qf1YBjlSiIoLQm.ML/KjFldq1oVxd7zHuFjhqPFbhtu4E2";

export const POST = handler(async (req) => {
  const ip = clientIp(req);
  const b = await body(req, schema);
  await rateLimit(`login:ip:${ip}`, 30, 900);
  await rateLimit(`login:email:${b.email.toLowerCase()}`, 8, 900);
  const u = await q1<{ id: string; password_hash: string; status: string; role: string }>(
    `SELECT id,password_hash,status,role FROM users WHERE email=$1 AND deleted_at IS NULL`, [b.email]);
  const ok = await verifyPassword(b.password, u?.password_hash ?? DUMMY);
  if (!u || !ok || u.status !== "active") {
    await audit({ action: "auth.login_failed", ip, meta: { email_known: !!u } });
    throw new HttpError(401, "bad_credentials", "Incorrect email or password");
  }
  await createSession(u.id, ip, req.headers.get("user-agent"));
  await audit({ actor: { id: u.id, role: u.role }, action: "auth.login", ip });
  return json({ ok: true });
});
