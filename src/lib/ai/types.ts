export type ChatMsg = { role: "user" | "assistant"; content: string };
export type StreamArgs = { model: string; system: string; messages: ChatMsg[]; signal?: AbortSignal };
export interface Provider {
  id: "anthropic" | "openai" | "google";
  configured(): boolean;
  /** Yields text deltas. Throws ProviderError on any upstream failure (never fabricate output). */
  stream(a: StreamArgs): AsyncGenerator<string>;
}
export class ProviderError extends Error {
  constructor(public provider: string, public status: number, message: string) { super(message); }
}

/** Minimal SSE reader: yields the `data:` payload of each event. */
export async function* sse(res: Response): AsyncGenerator<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const ev = buf.slice(0, i); buf = buf.slice(i + 2);
      const data = ev.split("\n").filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).join("\n");
      if (data) yield data;
    }
  }
}
