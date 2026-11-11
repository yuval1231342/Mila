import { q } from "./db";
import { hashIp } from "./crypto";

export async function audit(a: {
  actor?: { id: string; role: string } | null; action: string;
  targetType?: string; targetId?: string; ip?: string; meta?: Record<string, unknown>;
}) {
  await q(
    `INSERT INTO audit_logs(actor_user_id, actor_role, action, target_type, target_id, ip_hash, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [a.actor?.id ?? null, a.actor?.role ?? null, a.action, a.targetType ?? null, a.targetId ?? null,
     a.ip ? hashIp(a.ip) : null, JSON.stringify(a.meta ?? {})]
  );
}
