import type { Metadata } from "next";
import { requireVerifiedPage } from "@/lib/auth";
import { NotificationsClient } from "@/components/NotificationsClient";
export const metadata: Metadata = { title: "الإشعارات" };
export const dynamic = "force-dynamic";
export default async function NotificationsPage() { const user = await requireVerifiedPage(); return <NotificationsClient user={user}/>; }
