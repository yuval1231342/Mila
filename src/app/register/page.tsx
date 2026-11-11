import AuthForm from "@/components/AuthForm"; import { getLocale } from "@/lib/locale";
export const metadata = { title: "Register" };
export default function P() { return <AuthForm mode="register" locale={getLocale()} />; }
