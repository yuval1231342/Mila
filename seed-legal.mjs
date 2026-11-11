// Seeds legal document SKELETONS as drafts. These are NOT legal text. A lawyer must write/approve them.
import pg from "pg";
const slugs = ["terms","privacy","cookies","security","ai","acceptable-use","fair-use","image-generation","code-generation","copyright","subscriptions","cancellation","refunds","minors","retention","complaints","business"];
const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
for (const s of slugs) {
  const d = (await c.query(`INSERT INTO legal_documents(slug,requires_acceptance) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET slug=EXCLUDED.slug RETURNING id`, [s, s === "terms" || s === "privacy"])).rows[0];
  for (const lang of ["he", "en"]) {
    const body = lang === "he"
      ? `**טיוטה – LEGAL REVIEW REQUIRED.** תוכן המסמך טרם נכתב.\n\nשדות להשלמה: שם העוסק: MISSING CONFIGURATION · מספר עוסק: MISSING CONFIGURATION · כתובת: MISSING CONFIGURATION · דוא"ל ליצירת קשר: MISSING CONFIGURATION.`
      : `**DRAFT – LEGAL REVIEW REQUIRED.** Content not yet written.\n\nFields to complete: business name: MISSING CONFIGURATION · business number: MISSING CONFIGURATION · address: MISSING CONFIGURATION · contact email: MISSING CONFIGURATION.`;
    await c.query(`INSERT INTO legal_document_versions(document_id,lang,version,title,body_md,state,change_reason) VALUES ($1,$2,1,$3,$4,'draft','initial skeleton') ON CONFLICT DO NOTHING`, [d.id, lang, s, body]);
  }
}
await c.end(); console.log("seeded draft skeletons");
