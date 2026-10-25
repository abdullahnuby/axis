"use client";

import { LocalizedContent } from "@/components/LanguageProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings, UserRound, Bell, BriefcaseBusiness, Users, MessageCircle } from "lucide-react";
import { MobileCreatePostButton } from "@/components/MobileCreatePostButton";

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
  return <>{sideItems.map(({ href, text, icon: Icon }) => {
    const active = isActive(pathname, href);
    return <LocalizedContent>{Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={18}/>}</LocalizedContent><span>{text}</span></Link>;
  })}</>;
}

export function MobileNav() {
  const pathname = usePathname();
  const item = (href: string, text: string, Icon: typeof Home) => {
    const active = isActive(pathname, href);
    return <LocalizedContent>{Link href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><Icon size={19}/>}</LocalizedContent><span>{text}</span></Link>;
  };
  return <LocalizedContent>{nav className="mobile-bottom" aria-label="التنقل الرئيسي">
    {item("/feed", "الرئيسية", Home)}
    {item("/people", "المهندسين", Users)}
    <MobileCreatePostButton/>}</LocalizedContent>
    {item("/messages", "الرسائل", MessageCircle)}
    {item("/profile", "حسابي", UserRound)}
  </nav>;
}
