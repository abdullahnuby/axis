import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/Brand";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return <main className="legal-page" dir="rtl">
    <header className="topbar legal-topbar"><div className="topbar-inner"><Brand/><Link href="/" className="btn btn-small"><ArrowRight size={15}/> الصفحة الرئيسية</Link></div></header>
    <div className="container legal-container">
      <div className="legal-eyebrow"><ShieldCheck size={16}/> AXIS · مساحة خاصة للمهندسين</div>
      <h1 className="page-title legal-title">{title}</h1>
      <p className="legal-intro">{intro}</p>
      <p className="tiny muted legal-updated">آخر تحديث: 25 أكتوبر 2026</p>
      <div className="card legal-card">
        {sections.map((section, index) => <section className="legal-section" key={section.title}>
          <h2>{index + 1}. {section.title}</h2>
          {section.paragraphs?.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          {section.bullets?.length ? <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul> : null}
        </section>)}
      </div>
      <nav className="legal-links" aria-label="سياسات AXIS"><Link href="/privacy">الخصوصية</Link><Link href="/terms">شروط الاستخدام</Link><Link href="/community-guidelines">قواعد المجتمع</Link></nav>
    </div>
  </main>;
}
