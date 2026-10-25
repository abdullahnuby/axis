import type { ReactNode } from "react";
import Link from "next/link";
import { Home, Settings, UserRound, Bell, SlidersHorizontal, BriefcaseBusiness, Users, MessageCircle } from "lucide-react";
import type { SessionUser } from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";
import { UserAvatar } from "@/components/UserAvatar";
import { MobileCreatePostButton } from "@/components/MobileCreatePostButton";

const navItems = [
  { href: "/feed", text: "الرئيسية", icon: Home },
  { href: "/people", text: "دليل المهندسين", icon: Users },
  { href: "/groups", text: "المجموعات", icon: BriefcaseBusiness },
  { href: "/messages", text: "الرسائل", icon: MessageCircle },
  { href: "/profile", text: "ملفي المهني", icon: UserRound },
  { href: "/notifications", text: "الإشعارات", icon: Bell },
  { href: "/settings", text: "الإعدادات", icon: Settings },
];

export function AppShell({ user, children, active = "" }: { user: SessionUser; children: ReactNode; active?: string }) {
  return <div className="page-shell"><AppHeader user={user}/><div className="container shell-layout">
    <aside className="left-rail"><div className="card side-card">
      <div className="user-line" style={{ padding: "7px 8px 14px" }}><UserAvatar userId={user.id} displayName={user.display_name} avatarColor={user.avatar_color} hasAvatar={user.has_avatar} version={user.updated_at}/><div className="user-meta"><div className="user-name">{user.display_name}</div><div className="user-sub">@{user.username}</div></div></div>
      <hr className="divider" style={{ marginBottom: 6 }}/>
      {navItems.map(({ href, text, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${active === href ? "active" : ""}`}><Icon size={18}/><span>{text}</span></Link>)}
      <div className="muted tiny" style={{ padding: "14px 10px 5px" }}>AXIS · مجتمع المهندسين</div>
    </div></aside>
    <main className="feed-column">{children}</main>
    <aside className="right-stack">
      <div className="card event-card"><div className="between"><h2 className="section-title">اختار اللي يهمّك</h2><SlidersHorizontal size={17} className="muted"/></div><p className="small muted" style={{ margin: 0 }}>اختار تخصصك من الفلاتر علشان تتابع المشاركات الأقرب لشغلك.</p><div className="row"><BriefcaseBusiness size={16}/><span className="small">{user.specialty || "ضيف تخصصك في حسابك"}</span></div></div>
    </aside>
  </div>
  <footer className="app-legal-footer"><Link href="/privacy">الخصوصية</Link><Link href="/terms">شروط الاستخدام</Link><Link href="/community-guidelines">إرشادات المجتمع</Link></footer>
  <nav className="mobile-bottom" aria-label="التنقل الرئيسي"><Link href="/feed" className={active === "/feed" ? "active" : ""}><Home size={19}/><span>الرئيسية</span></Link><Link href="/people" className={active === "/people" ? "active" : ""}><Users size={19}/><span>المهندسين</span></Link><MobileCreatePostButton/><Link href="/messages" className={active === "/messages" ? "active" : ""}><MessageCircle size={19}/><span>الرسائل</span></Link><Link href="/profile" className={active === "/profile" ? "active" : ""}><UserRound size={19}/><span>حسابي</span></Link></nav>
  </div>;
}
