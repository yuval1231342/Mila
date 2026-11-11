import { getLocale } from "@/lib/locale";
export const metadata = { title: "Accessibility statement" };
export default function A() {
  const he = getLocale() === "he";
  return (<main className="mx-auto max-w-2xl p-6 space-y-3">
    <h1 className="text-2xl font-semibold">{he ? "הצהרת נגישות" : "Accessibility statement"}</h1>
    <p role="note" className="rounded border border-danger p-2 text-danger">
      {he ? "טיוטה. טרם בוצעה בדיקת נגישות מלאה (ידנית וממוחשבת), ולכן אין באתר הצהרת עמידה בתקן. LEGAL REVIEW REQUIRED · TECHNICAL VERIFICATION REQUIRED"
          : "DRAFT. A full accessibility audit (manual and automated) has not been performed, so no conformance claim is made. LEGAL REVIEW REQUIRED · TECHNICAL VERIFICATION REQUIRED"}
    </p>
    <p>{he ? "המערכת נבנתה מתוך כוונה לתמוך בניווט מקלדת, קוראי מסך, RTL וניגודיות מספקת. מי שנתקל בבעיה מוזמן לדווח בטופס שלהלן. פרטי רכז הנגישות: MISSING CONFIGURATION."
           : "The system is built to support keyboard navigation, screen readers, RTL and sufficient contrast. Please report problems with the form below. Accessibility coordinator details: MISSING CONFIGURATION."}</p>
  </main>);
}
