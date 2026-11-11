import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session"; import { q, q1 } from "@/lib/db"; import { audit } from "@/lib/audit";
export const metadata = { title: "Admin" }; export const dynamic = "force-dynamic";

export default async function Admin() {
  const u = await currentUser();
  if (!u || !["compliance", "admin", "super_admin"].includes(u.role)) redirect("/login");
  await audit({ actor: u, action: "admin.view_compliance_center" });
  const c = async (sql: string) => Number((await q1<{ n: string }>(sql))?.n ?? 0);
  const stats = {
    "Open privacy requests": await c(`SELECT count(*) n FROM privacy_requests WHERE status NOT IN ('completed','rejected')`),
    "Open security incidents": await c(`SELECT count(*) n FROM security_incidents WHERE status<>'resolved'`),
    "Open copyright complaints": await c(`SELECT count(*) n FROM copyright_complaints WHERE status IN ('received','reviewing','appealed')`),
    "Cancellation requests (30d)": await c(`SELECT count(*) n FROM cancellation_requests WHERE received_at > now()-interval '30 days'`),
    "Open accessibility reports": await c(`SELECT count(*) n FROM accessibility_reports WHERE status IN ('open','in_progress')`),
    "Legal docs awaiting review": await c(`SELECT count(*) n FROM legal_document_versions WHERE state IN ('draft','legal_review')`)
  };
  const missing = await q<{ key: string }>(`SELECT key FROM business_profile WHERE value IS NULL OR value=''`);
  return (<main className="mx-auto max-w-3xl p-6">
    <h1 className="mb-4 text-2xl font-semibold">Legal &amp; Compliance</h1>
    <dl className="grid grid-cols-2 gap-3">{Object.entries(stats).map(([k, v]) => (
      <div key={k} className="rounded border border-line bg-surface p-3"><dt className="text-sm text-muted">{k}</dt><dd className="text-2xl">{v}</dd></div>))}</dl>
    <h2 className="mt-6 font-semibold">MISSING CONFIGURATION ({missing.length})</h2>
    <p className="text-sm text-muted">{missing.map(m => m.key).join(", ") || "—"}</p>
    <p className="mt-6 text-sm text-muted">Read-only overview. Management forms for each area are not built yet (see README, "Not built").</p>
  </main>);
}
