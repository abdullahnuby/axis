"use client";
import { useState } from "react";
import { LogOut, ShieldCheck, KeyRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import type { SessionUser } from "@/lib/types";

export function SettingsClient({ user }: { user: SessionUser }) {
  const [busy, setBusy] = useState(false);
  async function logout() { setBusy(true); await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }
  return <AppShell user={user} active="/settings"><h1 className="page-title">الإعدادات</h1><p className="small muted" style={{ marginTop: -4 }}>إعدادات الحساب والخصوصية.</p><section className="card card-pad stack"><div className="settings-install-row"><div><h2 className="section-title">تطبيق AXIS على هاتفك</h2><p className="small muted" style={{ margin: "4px 0 0" }}>أضف اختصارًا للشاشة الرئيسية وافتح المنصة بواجهة مستقلة.</p></div><PWAInstallButton compact/></div><hr className="divider"/><div className="row"><ShieldCheck size={22}/><div><h2 className="section-title">{user.role === "member" ? "حالة العضوية" : "دور الحساب"}</h2><p className="small muted" style={{ margin: "4px 0 0" }}>{user.role === "member" ? "توثيق العضوية الهندسية يتم يدويًا. مستندات التحقق لا تظهر لباقي الأعضاء." : "هذا حساب إداري لإدارة AXIS، وليس اعتمادًا أو تصنيفًا مهنيًا."}</p></div></div><hr className="divider"/><div className="row"><KeyRound size={22}/><div><h2 className="section-title">بيانات الدخول</h2><p className="small muted" style={{ margin: "4px 0 0" }}>{user.email} · @{user.username}</p><p className="tiny muted" style={{ margin: "4px 0 0" }}>تغيير كلمة المرور واستعادتها عبر البريد يحتاج إعداد مزود بريد آمن قبل الإطلاق العام.</p></div></div><hr className="divider"/><div className="between"><div><h2 className="section-title">تسجيل الخروج</h2><p className="small muted" style={{ margin: "4px 0 0" }}>إنهاء جلسة هذا المتصفح.</p></div><button className="btn btn-danger" onClick={logout} disabled={busy}><LogOut size={17}/>{busy ? "جارٍ الخروج…" : "تسجيل الخروج"}</button></div></section></AppShell>;
}
