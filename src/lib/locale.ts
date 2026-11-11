import { cookies } from "next/headers";
import type { Locale } from "./i18n";
export function getLocale(): Locale { return cookies().get("mila_lang")?.value === "en" ? "en" : "he"; }
