import type { Metadata } from "next";
import { requireVerifiedPage } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ProfileClient } from "@/components/ProfileClient";
export const metadata: Metadata = { title: "ملفي المهني" };
export const dynamic = "force-dynamic";
export default async function ProfilePage() { const user = await requireVerifiedPage(); return <AppShell user={user} active="/profile"><ProfileClient initialUser={user}/></AppShell>; }
