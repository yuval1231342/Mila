import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { q1 } from "@/lib/db"; import { getLocale } from "@/lib/locale";
import { SLUGS } from "@/lib/legal-slugs";
import PrivacyRequestForm from "@/components/PrivacyRequestForm";
export const dynamic = "force-dynamic";

export default async function LegalDoc({ params }: { params: { slug: string } }) {
  const l = getLocale();
  if (params.slug === "privacy-request") return <main className="mx-auto max-w-xl p-6"><PrivacyRequestForm locale={l} /></main>;
  if (!SLUGS.some(([s]) => s === params.slug)) notFound();
  const prod = process.env.NODE_ENV === "production";
  const v = await q1<{ title: string; body_md: string; version: number; state: string; effective_at: string | null }>(
    `SELECT v.title,v.body_md,v.version,v.state,v.effective_at FROM legal_document_versions v JOIN legal_documents d ON d.id=v.document_id
      WHERE d.slug=$1 AND v.lang=$2 AND ($3 OR v.state='published') ORDER BY v.version DESC LIMIT 1`, [params.slug, l, !prod]).catch(() => null);
  return (
    <main className="mx-auto max-w-2xl p-6">
      {!v ? <p role="status">{l === "he" ? "המסמך טרם פורסם. LEGAL REVIEW REQUIRED." : "This document has not been published yet. LEGAL REVIEW REQUIRED."}</p> : (<>
        {v.state !== "published" && <p role="note" className="mb-3 rounded border border-danger p-2 text-danger">DRAFT — LEGAL REVIEW REQUIRED (not visible in production until published)</p>}
        <p className="text-sm text-muted">v{v.version}{v.effective_at ? ` · ${new Date(v.effective_at).toISOString().slice(0, 10)}` : ""}</p>
        <div className="prose-md"><ReactMarkdown>{`# ${v.title}\n\n${v.body_md}`}</ReactMarkdown></div>
      </>)}
    </main>
  );
}
