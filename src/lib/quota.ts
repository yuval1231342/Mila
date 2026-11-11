import { q1, q } from "./db";
import { HttpError } from "./http";

const period = () => new Date().toISOString().slice(0, 7);
const COL = { message: "monthly_messages", image: "monthly_images", code: "monthly_code_requests" } as const;

export async function userPlan(userId: string) {
  const row = await q1<{ plan_id: string }>(
    `SELECT plan_id FROM subscriptions WHERE user_id=$1 AND status IN ('active','cancel_requested')
       AND (current_period_end IS NULL OR current_period_end > now()) ORDER BY created_at DESC LIMIT 1`, [userId]);
  return row?.plan_id ?? "free";
}

/** Atomically consume one unit; throws 402 if the plan limit is reached. */
export async function consume(userId: string, kind: keyof typeof COL) {
  const plan = await userPlan(userId);
  const limitRow = await q1<Record<string, number>>(`SELECT ${COL[kind]} AS lim FROM plans WHERE id=$1`, [plan]);
  const limit = limitRow?.lim ?? 0;
  const row = await q1<{ used: number }>(
    `INSERT INTO usage_counters(user_id, period, kind, used) VALUES ($1,$2,$3,1)
     ON CONFLICT (user_id, period, kind) DO UPDATE SET used = usage_counters.used + 1
     WHERE usage_counters.used < $4 RETURNING used`, [userId, period(), kind, limit]);
  if (!row) throw new HttpError(402, "quota_exceeded", "Monthly usage limit reached for your plan");
  return plan;
}
export async function refund(userId: string, kind: keyof typeof COL) {
  await q(`UPDATE usage_counters SET used = GREATEST(used-1,0) WHERE user_id=$1 AND period=$2 AND kind=$3`, [userId, period(), kind]);
}
