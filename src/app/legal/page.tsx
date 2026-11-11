import Link from "next/link"; import { SLUGS } from "@/lib/legal-slugs"; import { getLocale } from "@/lib/locale";
export const metadata = { title: "Legal center" };
export default function Legal() {
  const l = getLocale();
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">{l === "he" ? "מרכז משפטי" : "Legal center"}</h1>
      <ul className="space-y-1">{SLUGS.map(([s, he, en]) => <li key={s}><Link className="underline" href={`/legal/${s}`}>{l === "he" ? he : en}</Link></li>)}</ul>
      <p className="mt-6"><Link className="underline" href="/legal/privacy-request">{l === "he" ? "בקשת עיון / תיקון / מחיקה" : "Access / correction / deletion request"}</Link></p>
    </main>
  );
}
