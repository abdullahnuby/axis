"use client";
import { useState, type FormEvent } from "react";
import { Save, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { SessionUser } from "@/lib/types";
import { SPECIALTIES } from "@/lib/constants";
import { ProfessionalBadges } from "@/components/ProfessionalIdentity";
import { Toast } from "@/components/Toast";

export function ProfileClient({ initialUser }: { initialUser: SessionUser }) {
  const [user, setUser] = useState(initialUser);
  const [displayName, setDisplayName] = useState(initialUser.display_name);
  const [specialty, setSpecialty] = useState(initialUser.specialty || "");
  const [bio, setBio] = useState(initialUser.bio || "");
  const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try { const response = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, specialty, bio }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "تعذّر حفظ الملف."); setUser(data.user); setSuccess("تم تحديث ملفك المهني."); }
    catch (e) { setError(e instanceof Error ? e.message : "حدث خطأ."); } finally { setBusy(false); }
  }
  return <div className="feed-column">
    <div className="between"><div><h1 className="page-title">ملفي المهني</h1><p className="small muted" style={{ margin: 0 }}>المعلومات التي تظهر للمهندسين داخل المجتمع.</p></div><Link href="/feed" className="btn"><ArrowRight size={16}/> الموجز</Link></div>
    <Toast message={error} error/><Toast message={success}/>
    <section className="card" style={{ overflow: "hidden" }}><div className="profile-cover"/><div className="profile-head"><div className="avatar lg" style={{ background: user.avatar_color }}>{user.display_name.slice(0,1)}</div><div style={{ flex: 1, minWidth: 200 }}><h2 className="section-title" style={{ marginBottom: 4 }}>{user.display_name}</h2><div className="badges"><ProfessionalBadges level={user.seniority_code} badges={user.verified_badges}/></div><div className="small muted" style={{ marginTop: 6 }}>{user.job_title || `مهندس ${user.specialty || ""}`} · خبرة معتمدة: {user.approved_years == null ? "غير محددة" : `${user.approved_years} سنة`}</div></div></div><hr className="divider"/><div className="profile-content"><h3 className="section-title">تعديل البيانات الظاهرة</h3><form className="form-stack" onSubmit={save}><div className="form-row"><label className="label" htmlFor="profile-name">اسم الظهور</label><input className="field" id="profile-name" value={displayName} onChange={e => setDisplayName(e.target.value)} required maxLength={80}/></div><div className="form-row"><label className="label" htmlFor="profile-specialty">التخصص</label><select className="field" id="profile-specialty" value={specialty} onChange={e => setSpecialty(e.target.value)}><option value="">اختر تخصصًا</option>{SPECIALTIES.map(s => <option key={s}>{s}</option>)}</select></div><div className="form-row"><label className="label" htmlFor="profile-bio">نبذة مهنية قصيرة</label><textarea className="field" id="profile-bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={600} placeholder="خبرتك واهتماماتك المهنية…"/></div><div><button className="btn btn-primary" disabled={busy} type="submit"><Save size={17}/>{busy ? "جارٍ الحفظ…" : "حفظ التغييرات"}</button></div></form><p className="small muted">لا يمكنك تعديل مستوى الخبرة أو الشارات المعتمدة بنفسك؛ تُراجع هذه البيانات يدويًا بواسطة الإدارة.</p></div></section>
  </div>;
}
