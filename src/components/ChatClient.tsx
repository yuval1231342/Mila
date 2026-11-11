"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { tr, type Locale } from "@/lib/i18n";

type Conv = { id: string; title: string; mode: string };
type Msg = { id?: string; role: "user" | "assistant"; content: string; status?: string };

export default function ChatClient({ locale }: { locale: Locale }) {
  const t = tr(locale);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const loadList = async () => { const r = await fetch("/api/conversations"); if (r.ok) setConvs(await r.json()); };
  useEffect(() => { loadList(); }, []);

  async function open(id: string) {
    setActive(id); setError(null);
    const r = await fetch(`/api/conversations/${id}`);
    if (r.ok) setMsgs((await r.json()).messages);
  }
  async function create(mode: "chat" | "code" = "chat") {
    const r = await fetch("/api/conversations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode }) });
    if (!r.ok) return null;
    const c = await r.json(); await loadList(); setActive(c.id); setMsgs([]); return c.id as string;
  }
  async function rename(c: Conv) {
    const title = prompt(t.rename, c.title); if (!title) return;
    await fetch(`/api/conversations/${c.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) });
    loadList();
  }
  async function remove(c: Conv) {
    if (!confirm(`${t.del}: ${c.title}?`)) return;
    await fetch(`/api/conversations/${c.id}`, { method: "DELETE" });
    if (active === c.id) { setActive(null); setMsgs([]); }
    loadList();
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setError(null);
    const id = active ?? (await create());
    if (!id) { setError("Could not create conversation"); return; }
    setMsgs(m => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setInput(""); setBusy(true);
    abort.current = new AbortController();
    try {
      const r = await fetch("/api/chat", {
        method: "POST", signal: abort.current.signal, headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: id, content: text })
      });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => null);
        setError(j?.error?.message ?? `Error ${r.status}`);
        setMsgs(m => m.slice(0, -1)); return;
      }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const line = buf.slice(0, i).replace(/^data: /, ""); buf = buf.slice(i + 2);
          const ev = JSON.parse(line);
          if (ev.delta) setMsgs(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + ev.delta }; return c; });
          if (ev.error) setError(ev.error);
        }
      }
    } catch (e) { if ((e as Error).name !== "AbortError") setError("Network error"); }
    finally { setBusy(false); abort.current = null; loadList(); }
  }
  const retry = () => { const lastUser = [...msgs].reverse().find(m => m.role === "user"); if (lastUser) send(lastUser.content); };

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col md:flex-row">
      <nav aria-label="Conversations" className="w-full shrink-0 overflow-y-auto border-b border-line bg-surface p-3 md:w-64 md:border-b-0 md:border-e">
        <button className="mb-3 w-full rounded bg-accent px-3 py-2 text-accent-ink" onClick={() => create()}>{t.newChat}</button>
        <ul className="space-y-1">
          {convs.map(c => (
            <li key={c.id} className="flex items-center gap-1">
              <button className={`flex-1 truncate rounded px-2 py-1 text-start ${c.id === active ? "bg-bg font-medium" : ""}`} onClick={() => open(c.id)}>{c.title}</button>
              <button aria-label={`${t.rename}: ${c.title}`} className="px-1 text-muted" onClick={() => rename(c)}>✎</button>
              <button aria-label={`${t.del}: ${c.title}`} className="px-1 text-muted" onClick={() => remove(c)}>✕</button>
            </li>
          ))}
        </ul>
      </nav>
      <section className="flex min-h-0 flex-1 flex-col" aria-label="Chat">
        <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {msgs.map((m, i) => (
            <article key={i} className={`max-w-3xl ${m.role === "user" ? "ms-auto rounded-lg bg-surface p-3" : ""}`}>
              <div className="prose-md"><ReactMarkdown>{m.content}</ReactMarkdown></div>
              {m.role === "assistant" && m.content && (
                <button className="text-xs text-muted underline" onClick={() => navigator.clipboard.writeText(m.content)}>{t.copy}</button>
              )}
            </article>
          ))}
          {error && <p role="alert" className="text-danger">{error} <button className="underline" onClick={retry}>{t.retry}</button></p>}
        </div>
        <form className="border-t border-line p-3" onSubmit={e => { e.preventDefault(); send(input); }}>
          <p className="mb-1 text-xs text-muted">{t.aiNotice}</p>
          <div className="flex gap-2">
            <label htmlFor="msg" className="sr-only">{t.placeholder}</label>
            <textarea id="msg" rows={2} value={input} onChange={e => setInput(e.target.value)} placeholder={t.placeholder}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              className="flex-1 resize-none rounded border border-line bg-surface p-2" />
            {busy
              ? <button type="button" className="rounded border border-line px-4" onClick={() => abort.current?.abort()}>{t.stop}</button>
              : <button type="submit" className="rounded bg-accent px-4 text-accent-ink">{t.send}</button>}
          </div>
        </form>
      </section>
    </div>
  );
}
