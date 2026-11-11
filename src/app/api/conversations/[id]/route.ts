import { z } from "zod";
import { body, handler, json, HttpError } from "@/lib/http";
import { q, q1 } from "@/lib/db";
import { requireUser } from "@/lib/session";

const idOf = (req: Request) => new URL(req.url).pathname.split("/").pop()!;
const uuid = z.string().uuid();

// Every query is scoped by user_id: a user can never read or modify another user's data.
export const GET = handler(async (req) => {
  const u = await requireUser(); const id = uuid.parse(idOf(req));
  const c = await q1(`SELECT id,title,mode FROM conversations WHERE id=$1 AND user_id=$2`, [id, u.id]);
  if (!c) throw new HttpError(404, "not_found", "Conversation not found");
  const msgs = await q(`SELECT id,role,content,status,created_at FROM messages WHERE conversation_id=$1 ORDER BY created_at`, [id]);
  return json({ ...c, messages: msgs });
});
export const PATCH = handler(async (req) => {
  const u = await requireUser(); const id = uuid.parse(idOf(req));
  const b = await body(req, z.object({ title: z.string().min(1).max(120) }));
  const r = await q(`UPDATE conversations SET title=$1 WHERE id=$2 AND user_id=$3 RETURNING id`, [b.title, id, u.id]);
  if (!r.length) throw new HttpError(404, "not_found", "Conversation not found");
  return json({ ok: true });
});
export const DELETE = handler(async (req) => {
  const u = await requireUser(); const id = uuid.parse(idOf(req));
  const r = await q(`DELETE FROM conversations WHERE id=$1 AND user_id=$2 RETURNING id`, [id, u.id]);
  if (!r.length) throw new HttpError(404, "not_found", "Conversation not found");
  return json({ ok: true });
});
