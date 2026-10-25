import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft, ArrowUpLeft, ChevronLeft, LockKeyhole, MessagesSquare,
  ShieldCheck, Workflow, FileCheck2, Fingerprint, EyeOff,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { CommunityBlueprint } from "@/components/CommunityBlueprint";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { getCurrentUser } from "@/lib/auth";

const principles = [
  {
    id: "01",
    icon: ShieldCheck,
    title: "الدخول له معايير",
    description: "بنراجع بيانات العضوية النقابية قبل ما الحساب يدخل مجتمع المهندسين.",
    tone: "blue",
  },
  {
    id: "02",
    icon: MessagesSquare,
    title: "نقاش مهني من غير رسميات زيادة",
    description: "اسأل عن موقف في الموقع، شارك تجربة مع إدارة أو HR، أو اطلب رأي زملائك.",
    tone: "teal",
  },
  {
    id: "03",
    icon: LockKeyhole,
    title: "الخصوصية جزء من التصميم",
    description: "مستندات التحقق مش معروضة للأعضاء، ورقم العضوية يُخزّن بصورة مشفّرة.",
    tone: "slate",
  },
];

const onboardingSteps = [
  { number: "01", title: "أنشئ حسابك", description: "اختار اسم الظهور وبيانات حسابك." },
  { number: "02", title: "قدّم بيانات العضوية", description: "ابعت رقم العضوية النقابية لاستكمال المراجعة." },
  { number: "03", title: "تابع حالة الطلب", description: "هنوضح لك حالة المراجعة أو أي معلومات محتاجة استكمال." },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.verification_status === "verified" || ["admin", "reviewer", "moderator"].includes(user.role) ? "/feed" : "/verification");

  return (
    <main className="landing-page">
      <header className="topbar landing-topbar">
        <div className="topbar-inner landing-topbar-inner">
          <Brand/>
          <div className="landing-topbar-center">
            <span className="landing-topbar-signal"><i/> مجتمع مهني بعضوية مراجَعة</span>
          </div>
          <nav className="topbar-actions landing-topbar-actions" aria-label="القائمة الرئيسية">
            <a className="btn btn-ghost landing-about-link" href="#why">عن AXIS</a>
            <Link className="btn landing-login-link" href="/login">دخول الأعضاء</Link>
            <Link className="btn btn-primary landing-register-link" href="/register">انضم للمجتمع <ArrowLeft size={16}/></Link>
          </nav>
        </div>
      </header>

      <section className="landing-hero grid-bg">
        <div className="container landing-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow"><span className="landing-eyebrow-symbol"><Workflow size={15}/></span><span>AXIS / ENGINEERING COMMUNITY</span><span className="landing-eyebrow-divider"/><span>مجتمع للمهندسين</span></div>
            <h1>مش كل نقاش مهني<br/><span>مكانه جروب عام.</span></h1>
            <p className="landing-hero-lead">في شغلنا مواقف محتاجة رأي ناس فاهمة المجال: شركة، مدير، HR، موقع، ضغط شغل أو قرار مهني. AXIS مساحة للأعضاء اللي بنراجع عضويتهم، عشان النقاش يبقى أقرب لواقع المهندسين وأبعد عن الجمهور العشوائي.</p>
            <div className="landing-hero-actions">
              <Link href="/register" className="btn btn-gold">ابدأ طلب العضوية <ArrowLeft size={17}/></Link>
              <Link href="/login" className="btn landing-secondary-action"><span className="landing-login-icon"><ArrowUpLeft size={16}/></span> عندك حساب؟ ادخل</Link>
              <PWAInstallButton/>
            </div>
            <div className="landing-proof-row">
              <div className="landing-proof-item"><span className="landing-proof-icon"><ShieldCheck size={16}/></span><span><strong>عضوية بتتراجع</strong><small>قبل الدخول للمجتمع</small></span></div>
              <span className="landing-proof-separator"/>
              <div className="landing-proof-item"><span className="landing-proof-icon teal"><LockKeyhole size={16}/></span><span><strong>بيانات تحقق محمية</strong><small>مش معروضة للأعضاء</small></span></div>
            </div>
          </div>
          <CommunityBlueprint/>
        </div>
        <div className="landing-hero-bottom" aria-hidden="true">
          <div className="container landing-hero-bottom-inner"><span>FIELD NOTES</span><span className="landing-hero-bottom-line"/><span>ENGINEERING / PEOPLE / EXPERIENCE</span><span className="landing-hero-bottom-line"/><span>AXIS — 001</span></div>
        </div>
      </section>

      <section className="landing-principles-section" id="why">
        <div className="container">
          <header className="landing-section-heading">
            <div><span className="landing-section-kicker">01 / الفكرة</span><h2>مجتمع معمول لطبيعة شغلنا.</h2></div>
            <p>مش مطلوب كل نقاش يبقى رسمي. المطلوب إن اللي بيشارك فاهم المجال، وإننا نحافظ على احترام الناس وسرية معلوماتهم.</p>
          </header>
          <div className="landing-principles-grid">
            {principles.map(item => {
              const Icon = item.icon;
              return <article className={`landing-principle-card tone-${item.tone}`} key={item.id}>
                <div className="landing-principle-top"><span className="landing-principle-number">{item.id}</span><span className="landing-principle-icon"><Icon size={22}/></span></div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className="landing-principle-rule"/>
              </article>;
            })}
          </div>
        </div>
      </section>

      <section className="landing-join-section">
        <div className="container landing-join-layout">
          <div className="landing-join-intro">
            <span className="landing-section-kicker">02 / طريق الانضمام</span>
            <h2>ثلاث خطوات،<br/><span>وبعدها تبدأ مشاركتك.</span></h2>
            <p>بنراجع العضوية عشان نعرف إن الحساب تابع لمهندس، مش عشان نطلب تفاصيل مهنية أكتر من اللازم.</p>
            <Link href="/register" className="landing-text-link">ابدأ إنشاء الحساب <ArrowLeft size={16}/></Link>
          </div>
          <div className="landing-steps">
            {onboardingSteps.map((step, index) => <article className="landing-step" key={step.number}>
              <div className="landing-step-number">{step.number}</div>
              <div className="landing-step-copy"><h3>{step.title}</h3><p>{step.description}</p></div>
              <span className={`landing-step-status ${index === 0 ? "first" : ""}`}>{index === 0 ? <Fingerprint size={18}/> : index === 1 ? <FileCheck2 size={18}/> : <CheckCircle2 size={18}/>}</span>
            </article>)}
          </div>
        </div>
      </section>

      <section className="container landing-privacy-section">
        <div className="landing-privacy-panel">
          <div className="landing-privacy-icon"><EyeOff size={22}/></div>
          <div className="landing-privacy-copy">
            <span className="landing-section-kicker">03 / الشفافية والخصوصية</span>
            <h2>الخصوصية لازم تكون واضحة، مش مجرد وعد.</h2>
            <p>بيانات التحقق الحساسة مش ظاهرة للأعضاء، ورقم العضوية النقابية يُخزّن مشفّرًا. لكن في الإصدار الحالي، المنشورات والتعليقات بتظهر باسم حسابك؛ <strong>النشر بهوية مجهولة لسه مش متاح</strong>. ما تشاركش أسرار شغل أو بيانات تخصك أو تخص غيرك.</p>
          </div>
          <Link href="/privacy" className="landing-privacy-link">تفاصيل الخصوصية <ChevronLeft size={16}/></Link>
        </div>
      </section>

      <section className="container landing-final-cta">
        <div className="landing-final-cta-art" aria-hidden="true"><div/><div/><div/></div>
        <div className="landing-final-cta-copy"><span className="landing-section-kicker">AXIS / YOUR PROFESSIONAL SPACE</span><h2>خلي خبرتك جزء من مجتمع أكبر.</h2><p>ابدأ حسابك، قدّم بيانات العضوية، وتابع حالة المراجعة.</p></div>
        <Link href="/register" className="btn btn-primary landing-final-cta-button">ابدأ الانضمام <ArrowLeft size={17}/></Link>
      </section>

      <footer className="landing-footer">
        <div className="container landing-footer-inner">
          <div className="landing-footer-brand"><Brand/><span>مساحة مهنية للمهندسين.</span></div>
          <nav className="legal-footer-links" aria-label="روابط قانونية"><Link href="/privacy">الخصوصية</Link><Link href="/terms">شروط الاستخدام</Link><Link href="/community-guidelines">قواعد المجتمع</Link><Link href="/admin/login">دخول الإدارة</Link></nav>
          <span className="landing-footer-copyright">AXIS © 2026</span>
        </div>
      </footer>
    </main>
  );
}
