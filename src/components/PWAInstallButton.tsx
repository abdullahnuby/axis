"use client";

import { useEffect, useState } from "react";
import { Share, Smartphone, X, Copy, Check } from "lucide-react";
import { usePWAInstall } from "@/components/PWAProvider";

export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { canInstall, isInstalled, isIOS, isSafari, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const [siteAddress, setSiteAddress] = useState("https://axis-three-omega.vercel.app");
  useEffect(() => { setSiteAddress(window.location.origin); }, []);
  if (isInstalled) return null;

  async function handleInstall() {
    if (canInstall) {
      const accepted = await install();
      if (!accepted) setShowGuide(true);
      return;
    }
    setShowGuide(true);
  }

  async function copyAddress() {
    let success = false;
    try {
      await navigator.clipboard.writeText(siteAddress);
      success = true;
    } catch {
      // Clipboard API can be blocked in embedded iOS browsers. Try the legacy selection copy.
      try {
        const field = document.createElement("textarea");
        field.value = siteAddress;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        field.style.fontSize = "16px";
        document.body.appendChild(field);
        field.select();
        success = document.execCommand("copy");
        field.remove();
      } catch { success = false; }
    }
    setCopied(success);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return <>
    <button type="button" className={`btn pwa-install-button ${compact ? "btn-small" : ""}`} onClick={() => void handleInstall()} aria-label="إضافة AXIS إلى الشاشة الرئيسية" title="إضافة AXIS إلى الشاشة الرئيسية">
      <Smartphone size={17} aria-hidden="true" />
      <span>{compact ? "تثبيت" : canInstall ? "تثبيت AXIS" : "أضف للشاشة الرئيسية"}</span>
    </button>
    {showGuide && <div className="pwa-guide-backdrop" role="presentation" onClick={() => setShowGuide(false)}>
      <section className="pwa-guide-card" role="dialog" aria-modal="true" aria-labelledby="pwa-guide-title" onClick={event => event.stopPropagation()}>
        <button type="button" className="icon-btn pwa-guide-close" onClick={() => setShowGuide(false)} aria-label="إغلاق التعليمات"><X size={18}/></button>
        <div className="pwa-guide-icon"><Smartphone size={25}/></div>
        <h2 id="pwa-guide-title">خلي AXIS على الشاشة الرئيسية</h2>
        {isIOS ? isSafari ? <>
          <p>في Safari على iPhone، الإضافة بتتم من قائمة المتصفح نفسها؛ الموقع ما يقدرش يضيف زرًا داخل قائمة المشاركة نيابةً عن Safari.</p>
          <ol className="pwa-steps"><li>اضغط زر <strong>مشاركة</strong> في Safari.</li><li>مرّر لأسفل في قائمة المشاركة واختر <strong>إضافة إلى الشاشة الرئيسية</strong>.</li><li>فعّل <strong>فتح كتطبيق ويب</strong> لو ظهر الاختيار، ثم اضغط <strong>إضافة</strong>.</li></ol>
          <p className="small muted">لو الخيار مش ظاهر، مرّر لآخر القائمة واختر «تعديل الإجراءات» لإضافته.</p>
        </> : <>
          <p>واضح إنك فاتح AXIS من متصفح مختلف عن Safari. بعض متصفحات iPhone لا تعرض خيار الإضافة في قائمة المشاركة؛ المسار الأضمن هو فتح نفس العنوان في <strong>Safari</strong>. زر التثبيت داخل AXIS يشرح الخطوات، لكنه لا يستطيع إضافة خيار إلى قائمة iOS نفسها.</p>
          <ol className="pwa-steps"><li>انسخ عنوان الموقع بالزر تحت.</li><li>افتح Safari والصق العنوان.</li><li>اضغط مشاركة ← <strong>إضافة إلى الشاشة الرئيسية</strong> ← <strong>إضافة</strong>.</li></ol>
          <label className="pwa-address-label" htmlFor="axis-pwa-address">عنوان AXIS</label>
          <input id="axis-pwa-address" className="field pwa-address-field" readOnly value={siteAddress} onFocus={event => event.currentTarget.select()} aria-label="عنوان AXIS لفتحه في Safari" />
          <button type="button" className="btn pwa-copy-address" onClick={() => void copyAddress()}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? "اتنسخ عنوان الموقع" : "نسخ عنوان AXIS لفتحه في Safari"}</button>
          {!copied && <p className="tiny muted">لو النسخ ما اشتغلش، اضغط مطولًا على العنوان فوق واختار نسخ.</p>}
        </> : <>
          <p>افتح قائمة المتصفح واختر <strong>تثبيت التطبيق</strong> أو <strong>إضافة إلى الشاشة الرئيسية</strong>.</p>
          <p className="small muted">لو التثبيت مش ظاهر، افتح الموقع في Chrome عبر HTTPS ثم جرّب قائمة المتصفح مرة أخرى.</p>
        </>}
        <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={() => setShowGuide(false)}>تمام</button>
      </section>
    </div>}
  </>;
}
