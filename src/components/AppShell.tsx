import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, Home, Settings, UserRound, Bell, SlidersHorizontal, BriefcaseBusiness, Plus, Users, MessageCircle } from "lucide-react";
import type { SessionUser, EngineeringEvent } from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";

const navItems = [
  { href: "/feed", text: "الرئيسية", icon: Home },
  { href: "/people", text: "دليل المهندسين", icon: Users },
  { href: "/groups", text: "المجموعات", icon: BriefcaseBusiness },
  { href: "/messages", text: "الرسائل", icon: MessageCircle },
  { href: "/profile", text: "ملفي المهني", icon: UserRound },
  { href: "/notifications", text: "الإشعارات", icon: Bell },
  { href: "/settings", text: "الإعدادات", icon: Settings },
];

export function AppShell({ user, children, events = [], active = "" }: { user: SessionUser; children: ReactNode; events?: EngineeringEvent[]; active?: string }) {
  return <div className="page-shell"><AppHeader user={user}/><div className="container shell-layout">
    <aside className="left-rail"><div className="card side-card">
      <div className="user-line" style={{ padding: "7px 8px 14px" }}><div className="avatar">{user.display_name.slice(0,1)}</div><div className="user-meta"><div className="user-name">{user.display_name}</div><div className="user-sub">@{user.username}</div></div></div>
      <hr className="divider" style={{ marginBottom: 6 }}/>
      {navItems.map(({ href, text, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${active === href ? "active" : ""}`}><Icon size={18}/><span>{text}</span></Link>)}
      <div className="muted tiny" style={{ padding: "14px 10px 5px" }}>AXIS · مجتمع المهندسين</div>
    </div></aside>
    <main className="feed-column">{children}</main>
    <aside className="right-stack">
      <div className="card event-card"><div className="between"><h2 className="section-title">فعاليات وأخبار</h2><CalendarDays size={17} className="muted"/></div>
        {events.length ? events.map((event) => <div className="event-row" key={event.id}><strong style={{ fontSize: 13 }}>{event.title}</strong>{event.starts_at && <div className="tiny muted">{new Date(event.starts_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" })}</div>}{event.location && <div className="tiny muted">{event.location}</div>}{event.description && <p className="small muted" style={{ margin: 0 }}>{event.description}</p>}{event.event_url && <a className="tiny" href={event.event_url} rel="noreferrer" target="_blank">اعرف التفاصيل ←</a>}</div>) : <p className="small muted" style={{ margin: 0 }}>لما نضيف فعالية جديدة هتلاقي تفاصيلها هنا.</p>}
      </div>
      <div className="card event-card"><div className="between"><h2 className="section-title">اختار اللي يهمّك</h2><SlidersHorizontal size={17} className="muted"/></div><p className="small muted" style={{ margin: 0 }}>اختار تخصصك من الفلاتر علشان تتابع المشاركات الأقرب لشغلك.</p><div className="row"><BriefcaseBusiness size={16}/><span className="small">{user.specialty || "ضيف تخصصك في حسابك"}</span></div></div>
    </aside>
  </div>
  <nav className="mobile-bottom" aria-label="التنقل الرئيسي"><Link href="/feed" className={active === "/feed" ? "active" : ""}><Home size={19}/><span>الرئيسية</span></Link><Link href="/people" className={active === "/people" ? "active" : ""}><Users size={19}/><span>المهندسين</span></Link><Link href="/feed#compose" className="mobile-compose-link" aria-label="إنشاء مشاركة جديدة"><span className="mobile-compose-icon"><Plus size={21}/></span><span>مشاركة</span></Link><Link href="/messages" className={active === "/messages" ? "active" : ""}><MessageCircle size={19}/><span>الرسائل</span></Link><Link href="/profile" className={active === "/profile" ? "active" : ""}><UserRound size={19}/><span>حسابي</span></Link></nav>
  </div>;
}
