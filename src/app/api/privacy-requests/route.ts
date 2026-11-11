import { z } from "zod";
import { body, handler, json, clientIp } from "@/lib/http";
import { q } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

// Open to signed-out visitors too (people may contact us after losing access). Identity is verified by staff.
export const POST = handler(async (req) => {
  const ip = clientIp(req);
  await rateLimit(`privacy:${ip}`, 5, 3600);
  const b = await body(req, z.object({
    kind: z.enum(["access", "correction", "deletion", "objection", "complaint"]),
    email: z.string().email(), details: z.string().max(4000).optional()
  }));
  const u = await currentUser();
  const [r] = await q<{ id: string }>(
    `INSERT INTO privacy_requests(user_id,contact_email,kind,details) VALUES ($1,$2,$3,$4) RETURNING id`,
    [u?.id ?? null, b.email, b.kind, b.details ?? null]);
  await audit({ actor: u, action: "privacy_request.create", targetType: "privacy_request", targetId: r.id, ip });
  return json({ ok: true, requestId: r.id }, 201);
});
