import { z } from "zod";
import { body, handler, json, clientIp } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { setConsent } from "@/lib/consent";
import { hashIp } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export const POST = handler(async (req) => {
  const u = await requireUser();
  const b = await body(req, z.object({
    purpose: z.enum(["marketing_email", "marketing_sms", "ai_training", "ai_memory"]),
    granted: z.boolean(), source: z.string().max(60).default("settings")
  }));
  await setConsent(u.id, b.purpose, b.granted, b.source, hashIp(clientIp(req)));
  await audit({ actor: u, action: "consent.set", targetType: "consent", targetId: b.purpose, meta: { granted: b.granted } });
  return json({ ok: true });
});
