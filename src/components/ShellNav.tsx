"use client";

import { LocalizedContent, useLanguage } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings, UserRound, Bell, BriefcaseBusiness, Users, MessageCircle, Menu, X, Languages, LogOut } from "lucide-react";

const sideItems = [
  { href: "/feed", text: "الرئيسية", icon: Home },
  { href: "/people", text: "الأعضاء", icon: Users },
  { href: "/groups", text: "الجروبات", icon: BriefcaseBusiness },
  { href: "/messages", text: "الرسائل", icon: MessageCircle },
  { href: "/profile", text: "حسابي", icon: UserRound },
  { href: "/notifications", text: "الإشعارات", icon: Bell },
  { href: "/settings", text: "الإعدادات", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
  return <LocalizedContent>{<>{sideItems.map(({ href, text, icon: Icon }) => {
    const active = isActive(pathname, href);
    return <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={18}/><span>{text}</span></Link>;
  })}</>}</LocalizedContent>;
}

const moreItems = [
  { href: "/profile", text: "حسابي", icon: UserRound },
  { href: "/notifications", text: "الإشعارات", icon: Bell },
  { href: "/settings", text: "الإعدادات", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  const item = (href: string, text: string, Icon: typeof Home) => {
    const active = isActive(pathname, href);
    return <Link href={href} aria-label={text} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><Icon size={19}/><span>{text}</span></Link>;
  };
  const moreActive = moreItems.some((m) => isActive(pathname, m.href));
  function switchLocale() {
    const next = language.locale === "ar" ? "en" : "ar";
    language.setLocale(next);
    void fetch("/api/me/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: next }) }).catch(() => {});
  }
  async function logout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally { window.location.href = "/"; }
  }
  return <LocalizedContent>{<>
    <nav className="mobile-bottom" aria-label="التنقل الرئيسي">
      {item("/feed", "الرئيسية", Home)}
      {item("/people", "الأعضاء", Users)}
      {item("/groups", "الجروبات", BriefcaseBusiness)}
      {item("/messages", "الرسائل", MessageCircle)}
      <button type="button" aria-label="المزيد" className={`mobile-more ${moreActive || open ? "active" : ""}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={19}/><span>المزيد</span></button>
    </nav>
    {open && <div className="more-sheet-backdrop" onClick={() => setOpen(false)}>
      <div className="more-sheet" role="dialog" aria-modal="true" aria-label="المزيد" onClick={(e) => e.stopPropagation()}>
        <div className="more-sheet-head"><strong>المزيد</strong><button type="button" className="more-sheet-close" aria-label="إغلاق" onClick={() => setOpen(false)}><X size={20}/></button></div>
        {moreItems.map(({ href, text, icon: Icon }) => <Link key={href} href={href} className={`more-sheet-item ${isActive(pathname, href) ? "active" : ""}`}><Icon size={20}/><span>{text}</span></Link>)}
        <button type="button" className="more-sheet-item" onClick={switchLocale}><Languages size={20}/><span>{language.locale === "ar" ? "English" : "العربية"}</span></button>
        <button type="button" className="more-sheet-item danger" onClick={logout}><LogOut size={20}/><span>تسجيل الخروج</span></button>
        <div className="more-sheet-legal"><Link href="/privacy">الخصوصية</Link><Link href="/terms">شروط الاستخدام</Link><Link href="/community-guidelines">إرشادات المجتمع</Link></div>
      </div>
    </div>}
  </>}</LocalizedContent>;
}
