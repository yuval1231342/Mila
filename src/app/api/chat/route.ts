import { z } from "zod";
import { body, handler, HttpError } from "@/lib/http";
import { q, q1 } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { consume, refund, userPlan } from "@/lib/quota";
import { enforceInputModeration } from "@/lib/moderation";
import { getProvider, parseModelId, SYSTEM_PROMPT, ProviderError } from "@/lib/ai";

const schema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(30000),
  modelId: z.string().optional()
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  await rateLimit(`chat:${user.id}`, 30, 60);
  const b = await body(req, schema);

  const conv = await q1<{ id: string; mode: string }>(
    `SELECT id,mode FROM conversations WHERE id=$1 AND user_id=$2`, [b.conversationId, user.id]);
  if (!conv) throw new HttpError(404, "not_found", "Conversation not found");

  // Model selection: must be enabled in admin AND allowed by the user's plan.
  const wanted = b.modelId ?? process.env.DEFAULT_MODEL;
  if (!wanted) throw new HttpError(503, "not_configured", "MISSING CONFIGURATION: DEFAULT_MODEL");
  const cfg = await q1<{ min_plan: string; enabled: boolean }>(`SELECT min_plan,enabled FROM ai_models WHERE id=$1`, [wanted]);
  if (!cfg?.enabled) throw new HttpError(503, "model_disabled", "This model is not enabled. An admin must enable it in ai_models.");
  const order = ["free", "pro", "ultra"];
  if (order.indexOf(await userPlan(user.id)) < order.indexOf(cfg.min_plan))
    throw new HttpError(403, "plan_required", "Your plan does not include this model");
  const pm = parseModelId(wanted)!;
  const provider = getProvider(pm.provider);
  if (!provider?.configured())
    throw new HttpError(503, "provider_not_configured", `AI provider "${pm.provider}" is not configured (missing API key).`);

  await enforceInputModeration(user.id, b.content);
  const kind = conv.mode === "code" ? "code" : "message";
  await consume(user.id, kind);

  await q(`INSERT INTO messages(conversation_id,role,content) VALUES ($1,'user',$2)`, [conv.id, b.content]);
  const history = await q<{ role: "user" | "assistant"; content: string }>(
    `SELECT role,content FROM (SELECT role,content,created_at FROM messages WHERE conversation_id=$1 AND status<>'error'
       ORDER BY created_at DESC LIMIT 40) t ORDER BY created_at`, [conv.id]);

  const ac = new AbortController();
  req.signal.addEventListener("abort", () => ac.abort());
  const enc = new TextEncoder();
  let full = "";

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: unknown) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
      let status: "complete" | "stopped" | "error" = "complete";
      try {
        for await (const delta of provider.stream({ model: pm.model, system: SYSTEM_PROMPT, messages: history, signal: ac.signal })) {
          full += delta; send({ delta });
        }
      } catch (e) {
        if (ac.signal.aborted) status = "stopped";
        else {
          status = "error";
          await refund(user.id, kind);             // do not charge quota for failed generations
          const msg = e instanceof ProviderError ? "The AI service is currently unavailable." : "Unexpected error.";
          send({ error: msg });
        }
      }
      if (full || status !== "complete")
        await q(`INSERT INTO messages(conversation_id,role,content,provider,model,status) VALUES ($1,'assistant',$2,$3,$4,$5)`,
          [conv.id, full, pm.provider, pm.model, status]).catch(() => {});
      await q(`UPDATE conversations SET updated_at=now() WHERE id=$1`, [conv.id]).catch(() => {});
      send({ done: true, status });
      ctrl.close();
    },
    cancel() { ac.abort(); }
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-store" } });
});
export const dynamic = "force-dynamic";
