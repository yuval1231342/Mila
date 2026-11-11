import { Provider, ProviderError, sse } from "./types";
export const anthropic: Provider = {
  id: "anthropic",
  configured: () => !!process.env.ANTHROPIC_API_KEY,
  async *stream({ model, system, messages, signal }) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal,
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, system, messages, max_tokens: 4096, stream: true })
    });
    if (!res.ok) throw new ProviderError("anthropic", res.status, `Anthropic returned ${res.status}`);
    for await (const data of sse(res)) {
      const j = JSON.parse(data);
      if (j.type === "content_block_delta" && j.delta?.type === "text_delta") yield j.delta.text as string;
      if (j.type === "error") throw new ProviderError("anthropic", 502, j.error?.message ?? "stream error");
    }
  }
};
