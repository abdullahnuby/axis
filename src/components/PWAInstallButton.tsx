"use client";

import { useState } from "react";
import { Share, Smartphone, X } from "lucide-react";
import { usePWAInstall } from "@/components/PWAProvider";

export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  if (isInstalled) return null;

  async function handleInstall() {
    if (canInstall) {
      const accepted = await install();
      if (!accepted) setShowGuide(true);
      return;
    }
    setShowGuide(true);
  }

  return <>
    <button type="button" className={`btn pwa-install-button ${compact ? "btn-small" : ""}`} onClick={handleInstall}>
      <Smartphone size={17} aria-hidden="true" />
      {canInstall ? "تثبيت AXIS كتطبيق" : "إضافة AXIS للموبايل"}
    </button>
    {showGuide && <div className="pwa-guide-backdrop" role="presentation" onClick={() => setShowGuide(false)}>
      <section className="pwa-guide-card" role="dialog" aria-modal="true" aria-labelledby="pwa-guide-title" onClick={event => event.stopPropagation()}>
        <button type="button" className="icon-btn pwa-guide-close" onClick={() => setShowGuide(false)} aria-label="إغلاق التعليمات"><X size={18}/></button>
        <div className="pwa-guide-icon"><Smartphone size={25}/></div>
        <h2 id="pwa-guide-title">أضف AXIS إلى شاشة هاتفك</h2>
        {isIOS ? <>
          <p>من المتصفح، اضغط على زر المشاركة، ثم اختر <strong>إضافة إلى الشاشة الرئيسية</strong>، وبعدها اضغط «إضافة».</p>
          <div className="pwa-guide-step"><Share size={19}/><span>المشاركة</span><span aria-hidden="true">←</span><strong>إضافة إلى الشاشة الرئيسية</strong></div>
          <p className="small muted">قد تختلف تسمية الخيار قليلًا باختلاف المتصفح. إذا لم يظهر، افتح الموقع في Safari أو استخدم قائمة المشاركة في متصفحك.</p>
        </> : <>
          <p>افتح قائمة المتصفح واختر <strong>تثبيت التطبيق</strong> أو <strong>إضافة إلى الشاشة الرئيسية</strong>.</p>
          <p className="small muted">إذا لم يظهر خيار التثبيت، تأكد من فتح AXIS عبر HTTPS ثم جرّب قائمة المتصفح مرة أخرى.</p>
        </>}
        <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setShowGuide(false)}>حسنًا</button>
      </section>
    </div>}
  </>;
}
