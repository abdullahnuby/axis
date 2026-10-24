import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { AdminClient } from "@/components/AdminClient";
export const metadata: Metadata = { title: "لوحة الإدارة" };
export const dynamic = "force-dynamic";
export default async function AdminPage() { const admin = await requireAdminPage(); return <AdminClient admin={admin}/>; }
