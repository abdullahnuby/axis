"use client";
import Link from "next/link";
import { Bell, Search, LogOut } from "lucide-react";
import { Brand } from "@/components/Brand";
import type { SessionUser } from "@/lib/types";

export function AppHeader({ user }: { user: SessionUser }) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }
  return <header className="topbar"><div className="topbar-inner">
    <Brand />
    <form action="/feed" className="search-box" role="search"><Search size={18} className="muted"/><input aria-label="بحث" name="q" placeholder="ابحث عن منشور أو مهندس" defaultValue=""/></form>
    <div className="topbar-actions">
      <Link className="icon-btn" aria-label="الإشعارات" href="/notifications"><Bell size={18}/></Link>
      <Link href="/profile" className="user-name" style={{ paddingInline: 4 }}><span className="avatar sm">{user.display_name.slice(0,1)}</span><span className="desktop-only">{user.display_name}</span></Link>
      <button className="icon-btn" aria-label="تسجيل الخروج" onClick={logout}><LogOut size={17}/></button>
    </div>
  </div></header>;
}
