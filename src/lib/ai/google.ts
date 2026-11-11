import { Provider, ProviderError, sse } from "./types";
export const google: Provider = {
  id: "google",
  configured: () => !!process.env.GOOGLE_AI_API_KEY,
  async *stream({ model, system, messages, signal }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
    const res = await fetch(url, {
      method: "POST", signal,
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GOOGLE_AI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))
      })
    });
    if (!res.ok) throw new ProviderError("google", res.status, `Google returned ${res.status}`);
    for await (const data of sse(res)) {
      const t = JSON.parse(data).candidates?.[0]?.content?.parts?.[0]?.text;
      if (t) yield t as string;
    }
  }
};
