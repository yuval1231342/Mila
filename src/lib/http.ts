import { NextResponse } from "next/server";
import { ZodError, ZodType } from "zod";
import { ConfigError } from "./env";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const err = (code: string, message: string, status: number) => json({ error: { code, message } }, status);

export async function body<T>(req: Request, schema: ZodType<T, any, any>): Promise<T> {
  try { return schema.parse(await req.json()); }
  catch (e) { throw new HttpError(400, "invalid_input", e instanceof ZodError ? e.issues.map(i => i.message).join("; ") : "Invalid JSON"); }
}
export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
/** Wrap route handlers: consistent error format, no stack traces leaked. */
export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      assertSameOrigin(req);
      return await fn(req);
    } catch (e) {
      if (e instanceof HttpError) return err(e.code, e.message, e.status);
      if (e instanceof ConfigError) return err("not_configured", e.message, 503);
      console.error("[route error]", e);
      return err("internal", "Internal error", 500);
    }
  };
}
/** CSRF defence: state-changing requests must come from our own origin (plus SameSite=Lax cookies). */
export function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  const appUrl = process.env.APP_URL;
  if (!origin || !appUrl || new URL(origin).origin !== new URL(appUrl).origin)
    throw new HttpError(403, "bad_origin", "Cross-origin request rejected");
}
export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
