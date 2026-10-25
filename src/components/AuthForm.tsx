"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Toast } from "@/components/Toast";

export function AuthForm({ mode }: { mode: "login" | "register" | "admin" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ displayName: "", username: "", email: "", password: "", rememberMe: false });
  const isRegister = mode === "register";
  const isAdmin = mode === "admin";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const endpoint = isAdmin ? "/api/admin/login" : isRegister ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, rememberMe: !isAdmin && !isRegister && form.rememberMe }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "حصلت مشكلة وإحنا بنكمل الطلب. جرّب تاني.");
      router.push(payload.redirect || (isAdmin ? "/admin" : isRegister ? "/verification" : "/feed"));
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع."); }
    finally { setLoading(false); }
  }
  return <div className="auth-bg"><div className="narrow"><div className="card auth-card">
    <div className="between" style={{ marginBottom: 25 }}><Brand/><span className="pill navy">{isAdmin ? "ADMIN" : "ENGINEERS ONLY"}</span></div>
    <h1 className="auth-title">{isAdmin ? "دخول الإدارة" : isRegister ? "إنشاء حساب AXIS" : "تسجيل الدخول"}</h1>
    <p className="muted" style={{ marginTop: 0, marginBottom: 22 }}>{isAdmin ? "دخول خاص بفريق إدارة AXIS." : isRegister ? "ابدأ حسابك، وبعدها ابعت إثبات عضويتك علشان تقدر تشارك زملاءك." : "نورت AXIS من جديد! سجّل دخولك وكمّل من مكان ما وقفت."}</p>
    <Toast message={error} error />
    <form className="form-stack" onSubmit={submit}>
      {isRegister && <><div className="form-row"><label className="label" htmlFor="displayName">اسم الظهور</label><input className="field" id="displayName" value={form.displayName} onChange={e => setForm({...form, displayName:e.target.value})} maxLength={80} required autoComplete="name" placeholder="الاسم اللي زملاؤك هيشوفوه"/></div><div className="form-row"><label className="label" htmlFor="username">اسم المستخدم</label><input className="field" id="username" value={form.username} onChange={e => setForm({...form, username:e.target.value})} minLength={3} maxLength={24} pattern="[A-Za-z0-9_.-]+" required autoComplete="username" placeholder="مثال: ahmed_civil"/><span className="tiny muted">إنجليزي أو أرقام و . _ - فقط</span></div></>}
      <div className="form-row"><label className="label" htmlFor="email">البريد الإلكتروني</label><div style={{ position: "relative" }}><Mail className="muted" size={17} style={{ position: "absolute", top: 14, right: 13 }}/><input className="field" style={{ paddingRight: 40 }} id="email" type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} required autoComplete="email" placeholder="you@example.com"/></div></div>
      <div className="form-row"><label className="label" htmlFor="password">كلمة المرور</label><div style={{ position: "relative" }}><LockKeyhole className="muted" size={17} style={{ position: "absolute", top: 14, right: 13 }}/><input className="field" style={{ paddingRight: 40 }} id="password" type="password" value={form.password} onChange={e => setForm({...form,password:e.target.value})} required minLength={10} autoComplete={isRegister ? "new-password" : "current-password"} placeholder="10 أحرف على الأقل"/></div></div>
      {!isAdmin && !isRegister && <label className="remember-me-option"><input type="checkbox" checked={form.rememberMe} onChange={e => setForm({...form, rememberMe: e.target.checked})}/> <span><strong>تذكرني على هذا الجهاز</strong><small>اتركها غير مفعّلة للخروج تلقائيًا عند إغلاق المتصفح.</small></span></label>}
      <button className="btn btn-primary" disabled={loading} type="submit" style={{ width: "100%", marginTop: 5 }}>{loading ? "جارٍ التنفيذ…" : isAdmin ? "دخول لوحة الإدارة" : isRegister ? "إنشاء الحساب" : "دخول AXIS"}</button>
    </form>
    {!isAdmin && <div className="small muted" style={{ textAlign: "center", marginTop: 20 }}>{isRegister ? <>عندك حساب بالفعل؟ <Link href="/login" style={{ color: "var(--blue)", fontWeight: 700 }}>سجّل الدخول</Link></> : <><Link href="/forgot-password" style={{ color: "var(--blue)", fontWeight: 700 }}>نسيت كلمة المرور؟</Link><span> · </span>ليس لديك حساب؟ <Link href="/register" style={{ color: "var(--blue)", fontWeight: 700 }}>أنشئ حسابًا</Link></>}</div>}
    {isAdmin && <div className="small muted" style={{ textAlign: "center", marginTop: 20 }}><Link href="/" style={{ color: "var(--blue)" }}>العودة إلى صفحة AXIS</Link></div>}
    {isRegister && <div className="alert" style={{ marginTop: 18 }}>بعد إنشاء الحساب، ابعت إثبات عضوية النقابة. فريق AXIS هيراجعه، وبعد الموافقة تقدر تشوف المشاركات وتتفاعل مع زملاءك.</div>}
  </div></div></div>;
}
