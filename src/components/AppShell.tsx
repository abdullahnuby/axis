import { LocalizedContent } from "@/components/LanguageProvider";
import type { ReactNode } from "react";
import Link from "next/link";
import { SlidersHorizontal, BriefcaseBusiness } from "lucide-react";
import type { SessionUser } from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";
import { UserAvatar } from "@/components/UserAvatar";
import { MobileNav, SidebarNav } from "@/components/ShellNav";

/** Rendered once by app/(app)/layout.tsx, so the header, sidebar and bottom nav survive page-to-page navigation. */
export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  return <LocalizedContent>{<div className="page-shell"><AppHeader user={user}/><div className="container shell-layout">
    <aside className="left-rail"><div className="card side-card">
      <div className="user-line" style={{ padding: "7px 8px 14px" }}><UserAvatar userId={user.id} displayName={user.display_name} avatarColor={user.avatar_color} hasAvatar={user.has_avatar} version={user.updated_at}/><div className="user-meta"><div className="user-name">{user.display_name}</div><div className="user-sub">@{user.username}</div></div></div>
      <hr className="divider" style={{ marginBottom: 6 }}/>
      <SidebarNav/>
      <div className="muted tiny" style={{ padding: "14px 10px 5px" }}>AXIS · مساحة خاصة للمهندسين</div>
    </div></aside>
    <main className="feed-column">{children}</main>
    <aside className="right-stack">
      <div className="card event-card"><div className="between"><h2 className="section-title">مساحتك هنا</h2><SlidersHorizontal size={17} className="muted"/></div><p className="small muted" style={{ margin: 0 }}>دي مساحة للأعضاء اللي تم التحقق منهم، مش صفحة مفتوحة للجمهور. منشوراتك بتظهر باسم حسابك، فخليك حريص في التفاصيل الحساسة.</p><div className="row"><BriefcaseBusiness size={16}/><span className="small">{user.specialty || "أضف المجال اللي بتحب تتكلم عنه"}</span></div></div>
    </aside>
  </div>
  <footer className="app-legal-footer"><Link href="/privacy">الخصوصية</Link><Link href="/terms">شروط الاستخدام</Link><Link href="/community-guidelines">إرشادات المجتمع</Link></footer>
  <MobileNav/>
  </div>}</LocalizedContent>;
}
