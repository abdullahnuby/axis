"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Search, LogOut, X, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/Brand";
import type { SessionUser } from "@/lib/types";

export function AppHeader({ user }: { user: SessionUser }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const isStaff = ["admin", "reviewer", "moderator"].includes(user.role);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }
  return <header className={`topbar app-topbar ${searchOpen ? "search-open" : ""}`}>
    <div className="topbar-inner">
      <Brand />
      <form action="/feed" className="search-box header-search" role="search">
        <Search size={18} className="muted" aria-hidden="true" />
        <input aria-label="بحث" name="q" placeholder="دوّر على منشور أو مهندس" defaultValue="" />
      </form>
      <div className="topbar-actions">
        {isStaff && <Link className="icon-btn staff-admin-shortcut" aria-label="لوحة الإدارة" href="/admin"><ShieldCheck size={18}/></Link>}
        <button type="button" className="icon-btn mobile-search-toggle" aria-label={searchOpen ? "إغلاق البحث" : "فتح البحث"} onClick={() => setSearchOpen(open => !open)}>
          {searchOpen ? <X size={18}/> : <Search size={18}/>}
        </button>
        <Link className="icon-btn header-notification" aria-label="الإشعارات" href="/notifications"><Bell size={18}/></Link>
        <Link href="/profile" className="user-name header-profile" style={{ paddingInline: 4 }} aria-label="حسابي">
          <span className="avatar sm">{user.display_name.slice(0,1)}</span><span className="desktop-only">{user.display_name}</span>
        </Link>
        <button className="icon-btn" aria-label="تسجيل الخروج" onClick={logout}><LogOut size={17}/></button>
      </div>
    </div>
  </header>;
}
