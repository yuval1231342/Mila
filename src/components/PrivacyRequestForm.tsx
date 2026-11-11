"use client";
import { useState } from "react"; import type { Locale } from "@/lib/i18n";
export default function PrivacyRequestForm({ locale }: { locale: Locale }) {
  const he = locale === "he"; const [msg, setMsg] = useState<string | null>(null); const [err, setErr] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const r = await fetch("/api/privacy-requests", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: f.get("kind"), email: f.get("email"), details: f.get("details") || undefined }) });
    const j = await r.json().catch(() => null); setErr(!r.ok);
    setMsg(r.ok ? `${he ? "הבקשה התקבלה. מספר פנייה:" : "Request received. Reference:"} ${j.requestId}` : j?.error?.message ?? "Error");
  }
  return (<form onSubmit={submit} className="space-y-3">
    <h1 className="text-2xl font-semibold">{he ? "בקשת פרטיות" : "Privacy request"}</h1>
    <div><label htmlFor="k">{he ? "סוג בקשה" : "Request type"}</label>
      <select id="k" name="kind" className="w-full rounded border border-line bg-surface p-2">
        <option value="access">{he ? "עיון במידע" : "Access"}</option><option value="correction">{he ? "תיקון מידע" : "Correction"}</option>
        <option value="deletion">{he ? "מחיקת מידע" : "Deletion"}</option><option value="complaint">{he ? "תלונה" : "Complaint"}</option></select></div>
    <div><label htmlFor="e">{he ? "אימייל ליצירת קשר" : "Contact email"}</label><input id="e" name="email" type="email" required className="w-full rounded border border-line bg-surface p-2" /></div>
    <div><label htmlFor="d">{he ? "פרטים" : "Details"}</label><textarea id="d" name="details" rows={4} maxLength={4000} className="w-full rounded border border-line bg-surface p-2" /></div>
    <button className="rounded bg-accent px-4 py-2 text-accent-ink">{he ? "שלח" : "Submit"}</button>
    {msg && <p role={err ? "alert" : "status"} className={err ? "text-danger" : ""}>{msg}</p>}
  </form>);
}
