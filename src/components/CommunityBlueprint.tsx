import { BadgeCheck, LockKeyhole, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/Brand";

export function CommunityBlueprint() {
  return (
    <section className="community-blueprint" aria-label="رسم توضيحي لفكرة مجتمع AXIS">
      <div className="blueprint-scanline" aria-hidden="true"/>
      <header className="blueprint-header">
        <div className="blueprint-brand">
          <Brand variant="mark"/>
          <div><strong>AXIS</strong><span>ENGINEERING COMMUNITY</span></div>
        </div>
        <span className="blueprint-access"><i/> MEMBER ACCESS</span>
      </header>

      <div className="blueprint-stage" aria-hidden="true">
        <svg className="blueprint-wiring" viewBox="0 0 460 300" fill="none" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="axis-wire" x1="50" y1="40" x2="390" y2="270" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1B75D0" stopOpacity=".2"/>
              <stop offset=".55" stopColor="#27D2C2" stopOpacity=".95"/>
              <stop offset="1" stopColor="#1B75D0" stopOpacity=".25"/>
            </linearGradient>
            <radialGradient id="axis-aura">
              <stop stopColor="#13B8B1" stopOpacity=".22"/>
              <stop offset="1" stopColor="#13B8B1" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="230" cy="150" r="130" fill="url(#axis-aura)"/>
          <circle cx="230" cy="150" r="112" stroke="#D4F6F1" strokeOpacity=".16" strokeDasharray="3 8"/>
          <circle cx="230" cy="150" r="82" stroke="#86E2D9" strokeOpacity=".5" strokeDasharray="1 6"/>
          <path d="M36 224C102 224 116 178 165 178H293C342 178 353 98 428 98" stroke="url(#axis-wire)" strokeWidth="1.3"/>
          <path d="M66 65H133C162 65 176 95 201 95H261C286 95 299 54 330 54H405" stroke="url(#axis-wire)" strokeWidth="1.3"/>
          <path d="M52 270H157C189 270 196 224 226 224C258 224 271 250 301 250H411" stroke="#2ED1C2" strokeOpacity=".44" strokeDasharray="3 6"/>
          <circle cx="133" cy="65" r="4" fill="#2ED1C2"/><circle cx="330" cy="54" r="4" fill="#2ED1C2"/>
          <circle cx="36" cy="224" r="4" fill="#347EDB"/><circle cx="428" cy="98" r="4" fill="#2ED1C2"/>
          <circle cx="226" cy="224" r="4" fill="#2ED1C2"/>
        </svg>
        <div className="blueprint-center">
          <div className="blueprint-center-symbol"><Brand variant="mark"/></div>
          <span className="blueprint-center-label">AXIS / 001</span>
          <strong>مساحة مهنية</strong>
          <span className="blueprint-center-sub">BUILT AROUND ENGINEERS</span>
        </div>

        <div className="blueprint-float blueprint-float-top">
          <span className="blueprint-float-icon"><ShieldCheck size={17}/></span>
          <div><strong>عضوية موثّقة</strong><small>مراجعة قبل الدخول</small></div>
          <BadgeCheck size={15} className="blueprint-float-check"/>
        </div>

        <div className="blueprint-float blueprint-float-bottom">
          <span className="blueprint-float-icon teal"><MessagesSquare size={17}/></span>
          <div><strong>نقاشات من أهل المجال</strong><small>خبرات، أسئلة، ومواقف حقيقية</small></div>
          <Sparkles size={15} className="blueprint-float-check"/>
        </div>
        <span className="blueprint-stage-index">01 <i/> 03</span>
      </div>

      <footer className="blueprint-footer">
        <div><LockKeyhole size={15}/><span>بوابة عضوية مقيّدة</span></div>
        <span className="blueprint-footer-rule"/>
        <div><BadgeCheck size={15}/><span>بيانات تحقق محمية</span></div>
        <span className="blueprint-footer-rule"/>
        <div><MessagesSquare size={15}/><span>مجتمع مهني متخصص</span></div>
      </footer>
    </section>
  );
}
