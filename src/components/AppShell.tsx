import type { ReactNode } from "react";
import Link from "next/link";
import {
  Home, Settings, UserRound, Bell, BriefcaseBusiness, Users, MessageCircle,
  ShieldCheck, LockKeyhole, BookOpenText, ArrowLeft, CheckCircle2,
  Network, Sparkles,
} from "lucide-react";
import type { SessionUser } from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";
import { UserAvatar } from "@/components/UserAvatar";
import { MobileCreatePostButton } from "@/components/MobileCreatePostButton";
import { Brand } from "@/components/Brand";

const navSections = [
  {
    label: "المجتمع",
    items: [
      { href: "/feed", text: "الرئيسية", icon: Home },
      { href: "/people", text: "دليل المهندسين", icon: Users },
      { href: "/groups", text: "المجموعات المهنية", icon: BriefcaseBusiness },
    ],
  },
  {
    label: "التواصل",
    items: [
      { href: "/messages", text: "الرسائل الخاصة", icon: MessageCircle },
      { href: "/notifications", text: "الإشعارات", icon: Bell },
    ],
  },
  {
    label: "حسابك",
    items: [
      { href: "/profile", text: "ملفي المهني", icon: UserRound },
      { href: "/settings", text: "الإعدادات", icon: Settings },
    ],
  },
];

function ProfileReadiness({ user }: { user: SessionUser }) {
  const steps = [
    Boolean(user.specialty),
    Boolean(user.job_title),
    Boolean(user.bio?.trim()),
    Boolean(user.has_avatar),
  ];
  const complete = steps.filter(Boolean).length;
  const percent = Math.round((complete / steps.length) * 100);
  return (
    <section className="rail-profile-readiness" aria-label="اكتمال الملف المهني">
      <div className="rail-readiness-top">
        <span>ملفك المهني</span>
        <strong>{percent.toLocaleString("en-US")}%</strong>
      </div>
      <div className="rail-readiness-track" role="progressbar" aria-label="نسبة اكتمال الملف" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <p>{percent === 100 ? "ملفك جاهز. خلي خبرتك تتكلم عنك." : "أضف تفاصيل بسيطة تساعد زملاءك يتعرفوا على خبرتك."}</p>
      <Link href="/profile" className="rail-inline-link">استكمال الملف <ArrowLeft size={14}/></Link>
    </section>
  );
}

export function AppShell({ user, children, active = "" }: { user: SessionUser; children: ReactNode; active?: string }) {
  const isMember = user.role === "member";
  return (
    <div className="page-shell">
      <AppHeader user={user}/>
      <div className="container shell-layout">
        <aside className="left-rail" aria-label="التنقل">
          <div className="card side-card">
            <div className="rail-brand-row">
              <Brand href="/feed" variant="mark"/>
              <div className="rail-brand-copy">
                <strong>مساحة المهندسين</strong>
                <span>AXIS COMMUNITY</span>
              </div>
              <span className="rail-brand-signal" aria-hidden="true"><span/></span>
            </div>

            <Link href="/profile" className="rail-profile-card">
              <div className="rail-profile-main">
                <UserAvatar userId={user.id} displayName={user.display_name} avatarColor={user.avatar_color} hasAvatar={user.has_avatar} version={user.updated_at} className="rail-profile-avatar"/>
                <div className="user-meta">
                  <strong className="rail-profile-name">{user.display_name}</strong>
                  <span className="rail-profile-handle" dir="ltr">@{user.username}</span>
                </div>
                <ArrowLeft size={15} className="rail-profile-arrow"/>
              </div>
              <div className="rail-profile-status">
                <span className={isMember ? "rail-status-dot" : "rail-status-dot staff"} aria-hidden="true"/>
                <span>{isMember ? "عضوية تم التحقق منها" : "فريق AXIS"}</span>
                {isMember && <ShieldCheck size={14}/>}
              </div>
              {user.specialty && <div className="rail-specialty-chip"><BriefcaseBusiness size={13}/>{user.specialty}</div>}
            </Link>

            <nav className="rail-navigation" aria-label="روابط المجتمع">
              {navSections.map(section => (
                <div className="rail-nav-section" key={section.label}>
                  <div className="rail-nav-label">{section.label}</div>
                  {section.items.map(({ href, text, icon: Icon }) => (
                    <Link key={href} href={href} aria-current={active === href ? "page" : undefined} className={`nav-link ${active === href ? "active" : ""}`}>
                      <span className="rail-nav-icon"><Icon size={18}/></span>
                      <span className="rail-nav-text">{text}</span>
                      {active === href && <span className="rail-nav-active-mark" aria-hidden="true"/>}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>

            <ProfileReadiness user={user}/>

            <div className="rail-footer-brand">
              <span className="rail-footer-mark"><Network size={14}/></span>
              <span>مساحة مهنية، مبنية على الثقة.</span>
            </div>
          </div>
        </aside>

        <main className="feed-column">{children}</main>

        <aside className="right-stack" aria-label="معلومات المجتمع">
          <section className="rail-welcome-card">
            <div className="rail-welcome-orbit" aria-hidden="true">
              <div className="rail-orbit orbit-one"/>
              <div className="rail-orbit orbit-two"/>
              <div className="rail-orbit-core"><Brand variant="mark" href="/feed"/></div>
              <span className="rail-orbit-node node-one"/>
              <span className="rail-orbit-node node-two"/>
              <span className="rail-orbit-node node-three"/>
            </div>
            <div className="rail-welcome-content">
              <span className="rail-eyebrow"><Sparkles size={13}/> مساحة للأعضاء</span>
              <h2>أهلًا بيك في AXIS</h2>
              <p>مكان للنقاش المهني وتبادل الخبرات مع مهندسين من مجالات مختلفة.</p>
            </div>
            <div className="rail-welcome-meta">
              <span><CheckCircle2 size={14}/> عضوية تمت مراجعتها</span>
              <span><LockKeyhole size={14}/> مستنداتك مش ظاهرة للأعضاء</span>
            </div>
          </section>

          <section className="card rail-principles-card">
            <header className="rail-card-heading">
              <span className="rail-heading-icon"><ShieldCheck size={17}/></span>
              <div><h2>اتكلم براحتك… بمسؤولية</h2><p>ثلاث قواعد تحافظ على قيمة المساحة</p></div>
            </header>
            <div className="rail-principles-list">
              <div className="rail-principle">
                <span className="rail-principle-icon"><MessageCircle size={16}/></span>
                <div><strong>النقاش قبل المجاملة</strong><p>اسأل، شارك تجربتك، واختلف مع الفكرة باحترام.</p></div>
              </div>
              <div className="rail-principle">
                <span className="rail-principle-icon teal"><LockKeyhole size={16}/></span>
                <div><strong>سرية الشغل أولوية</strong><p>اخفِ بيانات العملاء والمشروعات والمستندات الحساسة.</p></div>
              </div>
              <div className="rail-principle">
                <span className="rail-principle-icon slate"><BookOpenText size={16}/></span>
                <div><strong>تجربة واضحة، مش تشهير</strong><p>احكي الوقائع من وجهة نظرك وسيب مساحة للتوضيح.</p></div>
              </div>
            </div>
            <Link href="/community-guidelines" className="rail-guidelines-link">اقرأ إرشادات المجتمع <ArrowLeft size={15}/></Link>
          </section>

          <section className="rail-privacy-note">
            <span className="rail-privacy-icon"><LockKeyhole size={17}/></span>
            <div><strong>خصوصيتك تستحق الانتباه</strong><p>المنشورات حاليًا بتظهر باسم حسابك. تجنب أي تفاصيل ممكن تكشفك أو تكشف غيرك.</p><Link href="/privacy">اعرف حدود الخصوصية <ArrowLeft size={13}/></Link></div>
          </section>
        </aside>
      </div>

      <footer className="app-legal-footer">
        <span>AXIS <span aria-hidden="true">·</span> مجتمع مهني للمهندسين</span>
        <Link href="/privacy">الخصوصية</Link>
        <Link href="/terms">شروط الاستخدام</Link>
        <Link href="/community-guidelines">إرشادات المجتمع</Link>
      </footer>
      <nav className="mobile-bottom" aria-label="التنقل الرئيسي">
        <Link href="/feed" className={active === "/feed" ? "active" : ""}><Home size={19}/><span>الرئيسية</span></Link>
        <Link href="/people" className={active === "/people" ? "active" : ""}><Users size={19}/><span>المهندسين</span></Link>
        <MobileCreatePostButton/>
        <Link href="/messages" className={active === "/messages" ? "active" : ""}><MessageCircle size={19}/><span>الرسائل</span></Link>
        <Link href="/profile" className={active === "/profile" ? "active" : ""}><UserRound size={19}/><span>حسابي</span></Link>
      </nav>
    </div>
  );
}
