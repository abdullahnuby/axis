"use client";

import { LocalizedContent, useLanguage, type Locale, type UiPreferences } from "@/components/LanguageProvider";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Check,
  KeyRound,
  Languages,
  LockKeyhole,
  LogOut,
  Mail,
  MailCheck,
  MonitorSmartphone,
  Save,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { PushNotificationsControl } from "@/components/PushNotificationsControl";
import type { SessionUser } from "@/lib/types";
import { SPECIALTIES } from "@/lib/constants";

type SettingsSection = "account" | "security" | "preferences" | "notifications";

const DEFAULT_PREFERENCES: UiPreferences = { compactMode: false, reduceMotion: false };

const sections: Array<{ id: SettingsSection; label: string; icon: typeof UserRound }> = [
  { id: "account", label: "الحساب والملف", icon: UserRound },
  { id: "security", label: "الأمان وكلمة المرور", icon: ShieldCheck },
  { id: "preferences", label: "اللغة والعرض", icon: Languages },
  { id: "notifications", label: "الإشعارات والتطبيق", icon: BellRing },
];

function getPreferences(value: unknown): UiPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_PREFERENCES;
  const record = value as Record<string, unknown>;
  return { compactMode: record.compactMode === true, reduceMotion: record.reduceMotion === true };
}

export function SettingsClient({ user }: { user: SessionUser }) {
  const router = useRouter();
  const language = useLanguage();
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");

  const [displayName, setDisplayName] = useState(user.display_name);
  const [specialty, setSpecialty] = useState(user.specialty || "");
  const [bio, setBio] = useState(user.bio || "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");

  const [draftLocale, setDraftLocale] = useState<Locale>(user.preferred_locale || language.locale || "ar");
  const [draftPreferences, setDraftPreferences] = useState<UiPreferences>(getPreferences(user.ui_preferences));
  const [preferencesBusy, setPreferencesBusy] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [preferencesNotice, setPreferencesNotice] = useState("");

  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailNotice, setEmailNotice] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError("");
    setProfileNotice("");
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, specialty, bio }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نحفظ بيانات الحساب.");
      setDisplayName(payload.user.display_name);
      setSpecialty(payload.user.specialty || "");
      setBio(payload.user.bio || "");
      setProfileNotice("تم حفظ بيانات حسابك.");
      router.refresh();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "ما قدرناش نحفظ بيانات الحساب.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordNotice("");
    if (newPassword !== confirmPassword) {
      setPasswordError("كلمتا المرور الجديدتان غير متطابقتين.");
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      setPasswordError("استخدم كلمة مرور من 12 إلى 128 حرفًا.");
      return;
    }
    setPasswordBusy(true);
    try {
      const response = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نغيّر كلمة المرور.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice(payload.message || "تم تغيير كلمة المرور.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "ما قدرناش نغيّر كلمة المرور.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreferencesBusy(true);
    setPreferencesError("");
    setPreferencesNotice("");
    try {
      const response = await fetch("/api/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: draftLocale, preferences: draftPreferences }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نحفظ إعدادات العرض.");
      const savedLocale: Locale = payload.locale === "en" ? "en" : "ar";
      const savedPreferences = getPreferences(payload.preferences);
      setDraftLocale(savedLocale);
      setDraftPreferences(savedPreferences);
      language.setPreferences(savedPreferences);
      language.setLocale(savedLocale);
      setPreferencesNotice("تم حفظ إعداداتك. هتُطبّق اللغة والواجهة على الموقع كله.");
    } catch (error) {
      setPreferencesError(error instanceof Error ? error.message : "ما قدرناش نحفظ إعدادات العرض.");
    } finally {
      setPreferencesBusy(false);
    }
  }

  async function resendVerification() {
    setEmailBusy(true);
    setEmailError("");
    setEmailNotice("");
    try {
      const response = await fetch("/api/auth/resend-verification", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نبعت رسالة التأكيد.");
      setEmailNotice(payload.message || "راجع بريدك الإلكتروني.");
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "حصلت مشكلة أثناء إرسال التأكيد.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function logout() {
    setLogoutBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

  const isStaff = user.role !== "member";

  return <LocalizedContent>{<>
    <header className="settings-page-heading">
      <div className="settings-heading-icon"><Settings2 size={24}/></div>
      <div>
        <p className="settings-eyebrow">AXIS / ACCOUNT</p>
        <h1 className="page-title">إعدادات حسابك</h1>
        <p className="small muted settings-page-description">تحكم في بياناتك، وأمان حسابك، واللغة، وطريقة ظهور AXIS على جهازك.</p>
      </div>
    </header>

    <section className="settings-workspace" aria-label="إعدادات الحساب">
      <nav className="settings-tabs" role="tablist" aria-label="أقسام الإعدادات">
        {sections.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`settings-tab ${activeSection === id ? "active" : ""}`} type="button"
            role="tab" id={`settings-tab-${id}`} aria-selected={activeSection === id}
            aria-controls={`settings-panel-${id}`} onClick={() => setActiveSection(id)}>
            <Icon size={17}/><span>{label}</span>
          </button>
        ))}
      </nav>

      {activeSection === "account" && <section id="settings-panel-account" className="settings-panel" role="tabpanel" aria-labelledby="settings-tab-account">
        <div className="settings-panel-heading">
          <div><h2 className="section-title">بيانات الحساب</h2><p className="small muted">حدّث المعلومات الأساسية التي تظهر لك ولزملائك داخل AXIS.</p></div>
          <UserRound size={22} className="muted"/>
        </div>

        <form className="settings-form-stack" onSubmit={saveAccount}>
          <div className="settings-form-grid">
            <label className="form-row"><span className="label">اسم الظهور</span><input className="field" value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={80} minLength={2} autoComplete="name" required/></label>
            <label className="form-row"><span className="label">التخصص أو المجال</span><select className="field" value={specialty} onChange={event => setSpecialty(event.target.value)}><option value="">بدون تخصص</option>{SPECIALTIES.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
          </div>
          <label className="form-row"><span className="label">نبذة عنك</span><textarea className="field" value={bio} onChange={event => setBio(event.target.value)} maxLength={600} rows={4} placeholder="اكتب نبذة قصيرة عن خبرتك واهتماماتك المهنية…"/><span className="tiny muted">{bio.length}/600</span></label>

          <div className="settings-form-grid">
            <label className="form-row"><span className="label">البريد الإلكتروني</span><input className="field settings-readonly" value={user.email} readOnly dir="ltr"/><span className="tiny muted">لا يتم تغيير البريد من هذه الشاشة حفاظًا على أمان الحساب.</span></label>
            <label className="form-row"><span className="label">اسم المستخدم</span><input className="field settings-readonly" value={`@${user.username}`} readOnly dir="ltr"/><span className="tiny muted">اسم المستخدم الحالي ثابت في إعدادات الحساب.</span></label>
          </div>

          <div className="settings-account-status">
            <span className={`settings-status-dot ${user.verification_status === "verified" || isStaff ? "verified" : ""}`}/>
            <div><strong>{isStaff ? "حساب فريق AXIS" : user.verification_status === "verified" ? "عضوية هندسية معتمدة" : "العضوية قيد المراجعة"}</strong><p className="tiny muted">تعديل بيانات الحساب لا يغيّر حالة التوثيق أو الصلاحيات.</p></div>
            <Link href="/profile" className="settings-inline-link">الملف المهني</Link>
          </div>

          {profileError && <p className="alert error" role="alert">{profileError}</p>}
          {profileNotice && <p className="alert success" role="status"><Check size={15}/> {profileNotice}</p>}
          <div className="settings-form-actions"><button className="btn btn-primary" type="submit" disabled={profileBusy}><Save size={16}/>{profileBusy ? "جارٍ حفظ بيانات الحساب…" : "حفظ بيانات الحساب"}</button></div>
        </form>
      </section>}

      {activeSection === "security" && <section id="settings-panel-security" className="settings-panel" role="tabpanel" aria-labelledby="settings-tab-security">
        <div className="settings-panel-heading">
          <div><h2 className="section-title">الأمان وكلمة المرور</h2><p className="small muted">استخدم كلمة مرور جديدة وفريدة لحماية حسابك.</p></div>
          <ShieldCheck size={23} className="muted"/>
        </div>
        <div className="settings-security-note"><LockKeyhole size={18}/><p>ستحتاج إلى كلمة المرور الحالية. بعد التغيير، سيتم إنهاء الجلسات الأخرى لحماية الحساب، مع إبقاء هذا الجهاز متصلًا.</p></div>
        <form className="settings-form-stack" onSubmit={changePassword}>
          <label className="form-row"><span className="label">كلمة المرور الحالية</span><input className="field" type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" minLength={1} maxLength={128} required/></label>
          <div className="settings-form-grid">
            <label className="form-row"><span className="label">كلمة المرور الجديدة</span><input className="field" type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required/><span className="tiny muted">من 12 إلى 128 حرفًا.</span></label>
            <label className="form-row"><span className="label">تأكيد كلمة المرور الجديدة</span><input className="field" type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required/></label>
          </div>
          {passwordError && <p className="alert error" role="alert">{passwordError}</p>}
          {passwordNotice && <p className="alert success" role="status"><Check size={15}/> {passwordNotice}</p>}
          <div className="settings-form-actions"><button className="btn btn-primary" type="submit" disabled={passwordBusy}><KeyRound size={16}/>{passwordBusy ? "جارٍ تحديث كلمة المرور…" : "تغيير كلمة المرور"}</button><Link href="/forgot-password" className="settings-inline-link">نسيت كلمة المرور؟</Link></div>
        </form>

        <hr className="divider settings-divider"/>
        <div className="settings-panel-heading">
          <div><h2 className="section-title">تأكيد البريد الإلكتروني</h2><p className="small muted">يساعد تأكيد البريد على حماية الحساب واستعادة الوصول إليه.</p></div>
          {user.email_verified_at ? <MailCheck size={22} className="muted"/> : <Mail size={22} className="muted"/>}
        </div>
        <div className="settings-email-row">
          <div><strong>{user.email}</strong><p className="small muted">{user.email_verified_at ? "البريد الإلكتروني مؤكد." : "البريد الإلكتروني لم يتم تأكيده بعد."}</p></div>
          {!user.email_verified_at && <button className="btn btn-small" type="button" disabled={emailBusy} onClick={() => void resendVerification()}>{emailBusy ? "جارٍ الإرسال…" : "إرسال رابط التأكيد"}</button>}
        </div>
        {emailError && <p className="alert error" role="alert">{emailError}</p>}
        {emailNotice && <p className="alert success" role="status">{emailNotice}</p>}
      </section>}

      {activeSection === "preferences" && <section id="settings-panel-preferences" className="settings-panel" role="tabpanel" aria-labelledby="settings-tab-preferences">
        <div className="settings-panel-heading">
          <div><h2 className="section-title">اللغة وتفضيلات العرض</h2><p className="small muted">تُحفظ اختياراتك في حسابك وتُطبّق على AXIS في زياراتك القادمة.</p></div>
          <Languages size={23} className="muted"/>
        </div>
        <form className="settings-form-stack" onSubmit={savePreferences}>
          <label className="form-row"><span className="label">لغة الموقع</span><select className="field settings-language-select" value={draftLocale} onChange={event => setDraftLocale(event.target.value === "en" ? "en" : "ar")}><option value="ar">العربية</option><option value="en">English</option></select><span className="tiny muted">سيتم ضبط اتجاه الصفحات تلقائيًا: من اليمين إلى اليسار للعربية، ومن اليسار إلى اليمين للإنجليزية.</span></label>

          <div className="settings-preference-list">
            <label className="settings-toggle-row">
              <span className="settings-toggle-icon"><Settings2 size={19}/></span>
              <span className="settings-toggle-copy"><strong>واجهة مضغوطة</strong><span>تقليل المسافات بين البطاقات والعناصر لإظهار محتوى أكثر على الشاشة.</span></span>
              <input type="checkbox" checked={draftPreferences.compactMode} onChange={event => setDraftPreferences(old => ({ ...old, compactMode: event.target.checked }))}/>
            </label>
            <label className="settings-toggle-row">
              <span className="settings-toggle-icon"><MonitorSmartphone size={19}/></span>
              <span className="settings-toggle-copy"><strong>تقليل الحركة</strong><span>تقليل الحركات والانتقالات البصرية داخل الموقع.</span></span>
              <input type="checkbox" checked={draftPreferences.reduceMotion} onChange={event => setDraftPreferences(old => ({ ...old, reduceMotion: event.target.checked }))}/>
            </label>
          </div>

          {preferencesError && <p className="alert error" role="alert">{preferencesError}</p>}
          {preferencesNotice && <p className="alert success" role="status"><Check size={15}/> {preferencesNotice}</p>}
          <div className="settings-form-actions"><button className="btn btn-primary" type="submit" disabled={preferencesBusy}><Save size={16}/>{preferencesBusy ? "جارٍ حفظ التفضيلات…" : "حفظ تفضيلات الموقع"}</button></div>
        </form>
      </section>}

      {activeSection === "notifications" && <section id="settings-panel-notifications" className="settings-panel" role="tabpanel" aria-labelledby="settings-tab-notifications">
        <div className="settings-panel-heading">
          <div><h2 className="section-title">الإشعارات والتطبيق</h2><p className="small muted">إدارة تنبيهاتك وطريقة الوصول إلى AXIS من جهازك.</p></div>
          <BellRing size={23} className="muted"/>
        </div>
        <div className="settings-preference-block">
          <div className="settings-panel-heading"><div><h3 className="section-title">تنبيهات الهاتف</h3><p className="small muted">فعّل الإشعارات على هذا الجهاز لتلقي التنبيهات المهمة.</p></div><BellRing size={19} className="muted"/></div>
          <PushNotificationsControl/>
        </div>
        <hr className="divider settings-divider"/>
        <div className="settings-install-row">
          <div><h3 className="section-title">تطبيق AXIS على هاتفك</h3><p className="small muted" style={{ margin: "4px 0 0" }}>أضف AXIS إلى الشاشة الرئيسية لفتحه مثل أي تطبيق آخر.</p></div>
          <PWAInstallButton compact/>
        </div>
        <hr className="divider settings-divider"/>
        <div className="settings-logout-row">
          <div><h3 className="section-title">تسجيل الخروج</h3><p className="small muted">إنهاء جلسة الدخول على هذا الجهاز.</p></div>
          <button className="btn btn-danger" type="button" onClick={() => void logout()} disabled={logoutBusy}><LogOut size={16}/>{logoutBusy ? "جارٍ الخروج…" : "تسجيل الخروج"}</button>
        </div>
      </section>}
    </section>
  </>}</LocalizedContent>;
}
