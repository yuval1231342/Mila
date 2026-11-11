import AuthForm from "@/components/AuthForm"; import { getLocale } from "@/lib/locale";
export const metadata = { title: "Login" };
export default function P() { return <AuthForm mode="login" locale={getLocale()} />; }
