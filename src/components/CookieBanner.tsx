"use client";
import { useEffect, useState } from "react";
import { tr, type Locale } from "@/lib/i18n";

type Prefs = { analytics: boolean; marketing: boolean };
const KEY = "mila_cookie_prefs"; // stores only the user's choice (a necessary preference), never tracking data

/** Non-essential trackers must call hasCookieConsent() before loading. None are loaded in this codebase by default. */
export function hasCookieConsent(kind: keyof Prefs): boolean {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}")[kind] === true; } catch { return false; }
}

export default function CookieBanner({ locale }: { locale: Locale }) {
  const t = tr(locale);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(false);
  const [p, setP] = useState<Prefs>({ analytics: false, marketing: false });
  useEffect(() => { if (!localStorage.getItem(KEY)) setOpen(true); }, []);
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("mila:cookie-settings", h);
    return () => window.removeEventListener("mila:cookie-settings", h);
  }, []);
  const save = (v: Prefs) => { localStorage.setItem(KEY, JSON.stringify({ ...v, at: new Date().toISOString() })); setOpen(false); };
  if (!open) return (
    <button className="fixed bottom-2 end-2 text-xs underline text-muted" onClick={() => setOpen(true)}>{t.cookies}</button>
  );
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="ck-title"
         className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface p-4 shadow-lg">
      <div className="mx-auto max-w-3xl">
        <h2 id="ck-title" className="font-semibold">{t.cookies}</h2>
        <p className="text-sm text-muted">{t.cookieText}</p>
        {detail && (
          <fieldset className="mt-3 space-y-2 text-sm">
            <label className="flex gap-2"><input type="checkbox" checked disabled /> {t.necessary}</label>
            <label className="flex gap-2"><input type="checkbox" checked={p.analytics} onChange={e => setP({ ...p, analytics: e.target.checked })} /> {t.analytics}</label>
            <label className="flex gap-2"><input type="checkbox" checked={p.marketing} onChange={e => setP({ ...p, marketing: e.target.checked })} /> {t.marketing}</label>
          </fieldset>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="rounded bg-accent px-3 py-1.5 text-accent-ink" onClick={() => save({ analytics: true, marketing: true })}>{t.accept}</button>
          <button className="rounded border border-line px-3 py-1.5" onClick={() => save({ analytics: false, marketing: false })}>{t.reject}</button>
          {detail
            ? <button className="rounded border border-line px-3 py-1.5" onClick={() => save(p)}>{t.save}</button>
            : <button className="rounded border border-line px-3 py-1.5" onClick={() => setDetail(true)}>{t.cookies}</button>}
        </div>
      </div>
    </div>
  );
}
