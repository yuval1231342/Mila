import Link from "next/link"; import { getLocale } from "@/lib/locale"; import { tr } from "@/lib/i18n";
export default function Home() {
  const l = getLocale(); const t = tr(l);
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-4xl font-semibold">Mila</h1>
      <p className="mt-3 text-muted">{l === "he" ? "עוזר בינה מלאכותית לשיחה, כתיבה וקוד." : "An AI assistant for conversation, writing and code."}</p>
      <div className="mt-6 flex gap-3">
        <Link className="rounded bg-accent px-4 py-2 text-accent-ink" href="/register">{t.register}</Link>
        <Link className="rounded border border-line px-4 py-2" href="/login">{t.login}</Link>
      </div>
      <p className="mt-6 text-sm text-muted">{t.aiNotice}</p>
    </main>
  );
}
