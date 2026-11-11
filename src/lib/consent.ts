import { q, q1 } from "./db";

/** Latest consent row wins. Absence of a row = NOT consented. */
export async function hasConsent(userId: string, purpose: string) {
  const r = await q1<{ granted: boolean }>(
    `SELECT granted FROM user_consents WHERE user_id=$1 AND purpose=$2 ORDER BY created_at DESC LIMIT 1`, [userId, purpose]);
  return r?.granted === true;
}
/** Gate for ANY marketing send. Checks consent AND suppression list. */
export async function canSendMarketing(userId: string, channel: "marketing_email" | "marketing_sms") {
  const u = await q1<{ email: string }>(`SELECT email FROM users WHERE id=$1`, [userId]);
  if (!u) return false;
  const sup = await q1(`SELECT 1 FROM marketing_suppression WHERE email=$1`, [u.email]);
  if (sup) return false;
  return hasConsent(userId, channel);
}
export async function setConsent(userId: string, purpose: string, granted: boolean, source: string, ipHash: string | null) {
  await q(`INSERT INTO user_consents(user_id,purpose,granted,source,ip_hash) VALUES ($1,$2,$3,$4,$5)`,
    [userId, purpose, granted, source, ipHash]);
  if (!granted && purpose === "marketing_email") {
    const u = await q1<{ email: string }>(`SELECT email FROM users WHERE id=$1`, [userId]);
    if (u) await q(`INSERT INTO marketing_suppression(email,source) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [u.email, source]);
  }
  if (granted && purpose === "marketing_email") {
    const u = await q1<{ email: string }>(`SELECT email FROM users WHERE id=$1`, [userId]);
    if (u) await q(`DELETE FROM marketing_suppression WHERE email=$1`, [u.email]);
  }
}
