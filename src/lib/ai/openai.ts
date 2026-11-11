import { Provider, ProviderError, sse } from "./types";
export const openai: Provider = {
  id: "openai",
  configured: () => !!process.env.OPENAI_API_KEY,
  async *stream({ model, system, messages, signal }) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model, stream: true, messages: [{ role: "system", content: system }, ...messages] })
    });
    if (!res.ok) throw new ProviderError("openai", res.status, `OpenAI returned ${res.status}`);
    for await (const data of sse(res)) {
      if (data === "[DONE]") return;
      const t = JSON.parse(data).choices?.[0]?.delta?.content;
      if (t) yield t as string;
    }
  }
};
