import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
export default async function AdminLoginPage() { const user = await getCurrentUser(); if (user && ["admin", "reviewer", "moderator"].includes(user.role) && user.account_status === "active") redirect("/admin"); return <AuthForm mode="admin"/>; }
