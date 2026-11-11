import { q } from "./db";
import { HttpError } from "./http";

type Result = { status: "allowed" | "blocked" | "unconfigured" | "error"; categories: string[] };

/** Uses OpenAI's moderation endpoint when OPENAI_API_KEY is set. TECHNICAL VERIFICATION REQUIRED:
 *  confirm the model name and category list against current provider docs before launch. */
export async function moderate(text: string): Promise<Result> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { status: "unconfigured", categories: [] };
  try {
    const r = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "omni-moderation-latest", input: text.slice(0, 20000) })
    });
    if (!r.ok) return { status: "error", categories: [] };
    const j = await r.json();
    const res = j.results?.[0];
    const cats = Object.entries(res?.categories ?? {}).filter(([, v]) => v).map(([k]) => k);
    return { status: res?.flagged ? "blocked" : "allowed", categories: cats };
  } catch { return { status: "error", categories: [] }; }
}

export async function enforceInputModeration(userId: string, text: string) {
  const r = await moderate(text);
  await q(`INSERT INTO moderation_events(user_id, stage, result, categories) VALUES ($1,'input',$2,$3)`,
    [userId, r.status, r.categories]);
  if (r.status === "blocked") throw new HttpError(422, "content_blocked", "This request violates the acceptable use policy.");
  if (r.status !== "allowed" && process.env.MODERATION_REQUIRED !== "false")
    throw new HttpError(503, "moderation_unavailable", "Content safety check is unavailable. Service paused.");
}
