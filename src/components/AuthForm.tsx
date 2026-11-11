"use client";
import { useState } from "react";
import Link from "next/link";
import { tr, type Locale } from "@/lib/i18n";

export default function AuthForm({ mode, locale }: { mode: "login" | "register"; locale: Locale }) {
  const t = tr(locale);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null);
    const f = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = { email: f.get("email"), password: f.get("password") };
    if (mode === "register") {
      Object.assign(payload, { birthYear: Number(f.get("birthYear")), locale, acceptedTerms: f.get("terms") === "on", marketingEmail: f.get("marketing") === "on" });
    }
    const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) { location.href = "/chat"; return; }
    setError((await r.json().catch(() => null))?.error?.message ?? `Error ${r.status}`);
  }
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-semibold">{mode === "login" ? t.login : t.register}</h1>
      <form onSubmit={submit} className="space-y-3">
        <div><label htmlFor="email">{t.email}</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="w-full rounded border border-line bg-surface p-2" /></div>
        <div><label htmlFor="pw">{t.password}</label>
          <input id="pw" name="password" type="password" required minLength={mode === "register" ? 10 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} className="w-full rounded border border-line bg-surface p-2" /></div>
        {mode === "register" && (<>
          <div><label htmlFor="by">{locale === "he" ? "שנת לידה" : "Birth year"}</label>
            <input id="by" name="birthYear" type="number" required min={1900} max={new Date().getFullYear()} className="w-full rounded border border-line bg-surface p-2" /></div>
          <label className="flex gap-2 text-sm"><input type="checkbox" name="terms" required />
            <span>{locale === "he" ? "קראתי ואני מסכים/ה ל" : "I have read and agree to the "}
              <Link className="underline" href="/legal/terms">{locale === "he" ? "תנאי השימוש" : "Terms"}</Link>{locale === "he" ? " ול" : " and "}
              <Link className="underline" href="/legal/privacy">{locale === "he" ? "מדיניות הפרטיות" : "Privacy Policy"}</Link></span></label>
          {/* Separate, NOT pre-checked, not required: marketing consent is independent of terms. */}
          <label className="flex gap-2 text-sm"><input type="checkbox" name="marketing" />
            <span>{locale === "he" ? "אני מסכים/ה לקבל דיוור שיווקי באימייל (אופציונלי, ניתן לבטל בכל עת)" : "I agree to receive marketing email (optional, withdraw anytime)"}</span></label>
        </>)}
        {error && <p role="alert" className="text-danger">{error}</p>}
        <button className="w-full rounded bg-accent p-2 text-accent-ink">{mode === "login" ? t.login : t.register}</button>
      </form>
    </main>
  );
}
