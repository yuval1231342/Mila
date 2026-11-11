import { z } from "zod";
import { body, handler, json, HttpError } from "@/lib/http";
import { q, q1 } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

/** Records the cancellation request and stops renewal. NOT YET WIRED to a payment provider:
 *  when Stripe is connected, call the provider's cancel API here before marking cancel_requested.
 *  TECHNICAL VERIFICATION REQUIRED + LEGAL REVIEW REQUIRED (effective date rules under Consumer Protection Law). */
export const POST = handler(async (req) => {
  const u = await requireUser();
  const b = await body(req, z.object({ reason: z.string().max(500).optional() }));
  const sub = await q1<{ id: string; current_period_end: string | null }>(
    `SELECT id,current_period_end FROM subscriptions WHERE user_id=$1 AND status='active' ORDER BY created_at DESC LIMIT 1`, [u.id]);
  if (!sub) throw new HttpError(404, "no_active_subscription", "No active subscription");
  const [r] = await q<{ id: string; received_at: string }>(
    `INSERT INTO cancellation_requests(user_id,subscription_id,reason,effective_at) VALUES ($1,$2,$3,$4) RETURNING id,received_at`,
    [u.id, sub.id, b.reason ?? null, sub.current_period_end]);
  await q(`UPDATE subscriptions SET status='cancel_requested', auto_renew=false WHERE id=$1`, [sub.id]);
  await audit({ actor: u, action: "subscription.cancel_requested", targetType: "subscription", targetId: sub.id });
  return json({ ok: true, receipt: { requestId: r.id, receivedAt: r.received_at, serviceEndsAt: sub.current_period_end } });
});
