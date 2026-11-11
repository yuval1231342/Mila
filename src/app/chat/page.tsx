import { redirect } from "next/navigation";
import ChatClient from "@/components/ChatClient";
import { currentUser } from "@/lib/session"; import { getLocale } from "@/lib/locale";
export const metadata = { title: "Chat" }; export const dynamic = "force-dynamic";
export default async function P() { if (!(await currentUser())) redirect("/login"); return <ChatClient locale={getLocale()} />; }
