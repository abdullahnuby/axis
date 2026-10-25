"use client";

import { LocalizedContent } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, LogOut, X, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/Brand";
import type { SessionUser } from "@/lib/types";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { UserAvatar } from "@/components/UserAvatar";

export function AppHeader({ user }: { user: SessionUser }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  // The header now lives in a shared layout, so it must react to navigation itself:
  // close the mobile search drawer and re-check unread notifications on every page change.
  useEffect(() => {
    setSearchOpen(false);
    window.dispatchEvent(new Event("axis-notifications-updated"));
  }, [pathname]);
  useEffect(() => {
    let active = true;
    async function loadUnreadCount() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (active) setUnreadCount(Math.max(0, Number(payload.unreadCount) || 0));
      } catch { /* The navigation remains usable if the unread count is temporarily unavailable. */ }
    }
    void loadUnreadCount();
    const interval = window.setInterval(() => void loadUnreadCount(), 30_000);
    document.addEventListener("visibilitychange", loadUnreadCount);
    window.addEventListener("focus", loadUnreadCount);
    window.addEventListener("axis-notifications-updated", loadUnreadCount);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", loadUnreadCount);
      window.removeEventListener("focus", loadUnreadCount);
      window.removeEventListener("axis-notifications-updated", loadUnreadCount);
    };
  }, []);
  const isStaff = ["admin", "reviewer", "moderator"].includes(user.role);
  async function logout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { window.location.href = "/"; }
  }
  return <LocalizedContent>{<header className={`topbar app-topbar ${searchOpen ? "search-open" : ""}`}>
    <div className="topbar-inner">
      <Brand href="/feed" />
      <form action="/feed" className="search-box header-search" role="search">
        <Search size={18} className="muted" aria-hidden="true" />
        <input aria-label="بحث" name="q" placeholder="دوّر على منشور أو مهندس" defaultValue="" />
      </form>
      <div className="topbar-actions">
        <div className="header-install-action"><PWAInstallButton compact/></div>
        {isStaff && <Link className="icon-btn staff-admin-shortcut" aria-label="لوحة الإدارة" href="/admin"><ShieldCheck size={18}/></Link>}
        <button type="button" className="icon-btn mobile-search-toggle" aria-label={searchOpen ? "إغلاق البحث" : "فتح البحث"} onClick={() => setSearchOpen(open => !open)}>
          {searchOpen ? <X size={18}/> : <Search size={18}/>}
        </button>
        <Link className="icon-btn header-notification" aria-label={unreadCount > 0 ? `الإشعارات، ${unreadCount} غير مقروء` : "الإشعارات"} href="/notifications" title="الإشعارات">
          <Bell size={18}/>
          {unreadCount > 0 && <span className="notification-count-badge" aria-label={`${unreadCount} إشعارات غير مقروءة`}>{unreadCount > 99 ? "99+" : unreadCount.toLocaleString("ar-EG-u-nu-latn")}</span>}
        </Link>
        <Link href="/profile" className="user-name header-profile" style={{ paddingInline: 4 }} aria-label="حسابي">
          <UserAvatar userId={user.id} displayName={user.display_name} avatarColor={user.avatar_color} hasAvatar={user.has_avatar} version={user.updated_at} className="sm"/><span className="desktop-only">{user.display_name}</span>
        </Link>
        <button className="icon-btn" aria-label="تسجيل الخروج" onClick={logout}><LogOut size={17}/></button>
      </div>
    </div>
  </header>}</LocalizedContent>;
}
