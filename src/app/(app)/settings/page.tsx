import type { Metadata } from "next";
import { requireVerifiedPage } from "@/lib/auth";
import { SettingsClient } from "@/components/SettingsClient";
export const metadata: Metadata = { title: "الإعدادات" };
export const dynamic = "force-dynamic";
export default async function SettingsPage() { const user = await requireVerifiedPage(); return <SettingsClient user={user}/>; }
