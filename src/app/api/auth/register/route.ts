import { z } from "zod";
import { body, handler, json, HttpError, clientIp } from "@/lib/http";
import { q, q1 } from "@/lib/db";
import { createSession, hashPassword, passwordPolicyError } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { setConsent } from "@/lib/consent";
import { hashIp } from "@/lib/crypto";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().max(200),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
  locale: z.enum(["he", "en"]).default("he"),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the Terms and Privacy Policy" }) }),
  marketingEmail: z.boolean().default(false)       // separate, unchecked by default
});

export const POST = handler(async (req) => {
  const ip = clientIp(req);
  await rateLimit(`register:${ip}`, 10, 3600);
  const b = await body(req, schema);

  // MISSING CONFIGURATION: the owner must set the minimum age after legal review (LEGAL REVIEW REQUIRED).
  const minAge = Number(process.env.MIN_AGE);
  if (!minAge) throw new HttpError(503, "not_configured", "MISSING CONFIGURATION: MIN_AGE");
  if (new Date().getFullYear() - b.birthYear < minAge)
    throw new HttpError(403, "under_age", "You do not meet the minimum age for this service.");

  const pwErr = passwordPolicyError(b.password);
  if (pwErr) throw new HttpError(400, "weak_password", pwErr);

  // The versions the user is about to accept must be published (production) - recorded below.
  const versions = await q<{ id: string }>(
    `SELECT v.id FROM legal_document_versions v JOIN legal_documents d ON d.id=v.document_id
      WHERE d.slug IN ('terms','privacy') AND v.lang=$1 AND ($2 OR v.state='published')
        AND v.version = (SELECT max(version) FROM legal_document_versions WHERE document_id=d.id AND lang=$1 AND ($2 OR state='published'))`,
    [b.locale, process.env.NODE_ENV !== "production"]);
  if (versions.length < 2) throw new HttpError(503, "legal_not_published", "Legal documents are not published yet (LEGAL REVIEW REQUIRED).");

  if (await q1(`SELECT 1 FROM users WHERE email=$1`, [b.email]))
    throw new HttpError(409, "email_taken", "Could not create account with these details");

  const u = (await q<{ id: string }>(
    `INSERT INTO users(email,password_hash,locale,birth_year) VALUES ($1,$2,$3,$4) RETURNING id`,
    [b.email, await hashPassword(b.password), b.locale, b.birthYear]))[0];

  const ipHash = hashIp(ip);
  for (const v of versions)
    await q(`INSERT INTO user_legal_acceptances(user_id,version_id,screen,ip_hash,user_agent) VALUES ($1,$2,'register',$3,$4)`,
      [u.id, v.id, ipHash, req.headers.get("user-agent")?.slice(0, 300) ?? null]);
  if (b.marketingEmail) await setConsent(u.id, "marketing_email", true, "register_checkbox", ipHash);

  await createSession(u.id, ip, req.headers.get("user-agent"));
  await audit({ actor: { id: u.id, role: "user" }, action: "user.register", targetType: "user", targetId: u.id, ip });
  return json({ ok: true });
});
