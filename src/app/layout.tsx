import type { Metadata } from "next";
import "./globals.css";
import { getLocale } from "@/lib/locale";
import { dir, tr } from "@/lib/i18n";
import CookieBanner from "@/components/CookieBanner";
import Link from "next/link";

export const metadata: Metadata = { title: { default: "Mila", template: "%s · Mila" }, description: "Mila – AI assistant" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale(); const t = tr(locale);
  return (
    <html lang={locale} dir={dir(locale)}>
      <body>
        <a className="skip" href="#main">{locale === "he" ? "דלג לתוכן" : "Skip to content"}</a>
        <div id="main" tabIndex={-1}>{children}</div>
        <footer className="border-t border-line px-4 py-3 text-sm text-muted flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/legal">{t.legal}</Link>
          <Link href="/legal/cancellation">{t.cancelSub}</Link>
          <Link href="/accessibility">{t.accessibility}</Link>
          <Link href="/legal/privacy">{locale === "he" ? "פרטיות" : "Privacy"}</Link>
          <Link href="/legal/terms">{locale === "he" ? "תנאי שימוש" : "Terms"}</Link>
        </footer>
        <CookieBanner locale={locale} />
      </body>
    </html>
  );
}
