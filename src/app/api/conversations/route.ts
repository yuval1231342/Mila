import { z } from "zod";
import { body, handler, json } from "@/lib/http";
import { q } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const GET = handler(async () => {
  const u = await requireUser();
  return json(await q(`SELECT id,title,mode,updated_at FROM conversations WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 200`, [u.id]));
});
export const POST = handler(async (req) => {
  const u = await requireUser();
  const b = await body(req, z.object({ mode: z.enum(["chat", "code"]).default("chat") }));
  const [c] = await q(`INSERT INTO conversations(user_id,mode) VALUES ($1,$2) RETURNING id,title,mode`, [u.id, b.mode]);
  return json(c, 201);
});
