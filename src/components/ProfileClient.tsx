"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Bell, BriefcaseBusiness, CalendarDays,
  GraduationCap, LockKeyhole, MessageCircle, PencilLine, Save, ShieldCheck,
  ThumbsUp, UserRound, X,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import type { SessionUser } from "@/lib/types";
import { BADGE_OPTIONS, GLOSSARY, SPECIALTIES } from "@/lib/constants";
import { ProfessionalBadges } from "@/components/ProfessionalIdentity";
import { Toast } from "@/components/Toast";

export type ProfilePostPreview = {
  id: string;
  body: string;
  specialty: string | null;
  created_at: string;
  has_image: boolean;
  like_count: number;
  comment_count: number;
};

const levelLabels: Record<string, string> = {
  JNR: "مهندس مبتدئ",
  MID: "مهندس متوسط الخبرة",
  SNR: "مهندس أقدم",
  EXP: "خبير هندسي",
};
const badgeLabels = new Map(BADGE_OPTIONS.map((badge) => [badge.code, badge.label]));
const levelDescriptions = new Map(GLOSSARY.map((item) => [item.code, item.description]));

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
function formatCount(value: number) {
  return new Intl.NumberFormat("ar-EG", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

export function ProfileClient({ initialUser, initialPosts }: { initialUser: SessionUser; initialPosts: ProfilePostPreview[] }) {
  const [user, setUser] = useState(initialUser);
  const [displayName, setDisplayName] = useState(initialUser.display_name);
  const [specialty, setSpecialty] = useState(initialUser.specialty || "");
  const [bio, setBio] = useState(initialUser.bio || "");
  const [posts] = useState(initialPosts);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const isMember = user.role === "member";
  const approvedBadges = isMember ? user.verified_badges.filter((code) => badgeLabels.has(code)) : [];

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, specialty, bio }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر حفظ الملف.");
      setUser(data.user); setSuccess("تم تحديث ملفك المهني."); setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ أثناء حفظ الملف.");
    } finally { setBusy(false); }
  }

  return <div className="profile-app">
    <header className="topbar profile-topbar">
      <div className="topbar-inner">
        <Link href="/feed" className="btn btn-small profile-back-link"><ArrowRight size={15}/> العودة للموجز</Link>
        <Brand />
      </div>
    </header>

    <main className="profile-page">
      <Toast message={error} error />
      <Toast message={success} />

      <section className="card profile-hero-card">
        <div className="profile-cover" aria-hidden="true"><span className="profile-cover-wordmark">AXIS</span></div>
        <div className="profile-hero-details">
          <div className="profile-identity">
            <div className="avatar profile-avatar" style={{ background: user.avatar_color }}>{user.display_name.slice(0, 1)}</div>
            <div className="profile-identity-copy">
              <div className="profile-name-row">
                <h2>{user.display_name}</h2>
                {isMember && user.verification_status === "verified" ? <span className="pill green profile-member-verified"><BadgeCheck size={13}/> عضو موثّق</span> : <span className="pill navy profile-admin-pill"><ShieldCheck size={13}/> حساب إداري</span>}
              </div>
              <div className="profile-username" dir="ltr">@{user.username}</div>
              {isMember ? <div className="badges profile-badges"><ProfessionalBadges level={user.seniority_code} badges={approvedBadges}/></div> : null}
              <div className="profile-meta-line">
                {user.specialty ? <span><BriefcaseBusiness size={13}/>{user.specialty}</span> : null}
                {user.job_title && isMember ? <span>{user.job_title}</span> : null}
                {user.created_at ? <span><CalendarDays size={13}/> عضو منذ {formatDate(user.created_at)}</span> : null}
              </div>
            </div>
          </div>
          <button className="btn btn-primary profile-edit-button" onClick={() => {
            if (editing) { setDisplayName(user.display_name); setSpecialty(user.specialty || ""); setBio(user.bio || ""); }
            setEditing((value) => !value);
          }} aria-expanded={editing} aria-controls="profile-edit-panel">
            {editing ? <X size={16}/> : <PencilLine size={16}/>} {editing ? "إغلاق التعديل" : "تعديل الملف"}
          </button>
        </div>
      </section>

      {editing && <section id="profile-edit-panel" className="card profile-edit-panel">
        <div className="profile-section-heading"><div><h2 className="section-title">تعديل البيانات الظاهرة</h2><p className="small muted">حدّث بيانات التعريف التي تظهر للمهندسين.</p></div><PencilLine size={19} className="muted"/></div>
        <form className="form-stack" onSubmit={save}>
          <div className="form-grid">
            <div className="form-row"><label className="label" htmlFor="profile-name">اسم الظهور</label><input className="field" id="profile-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} maxLength={80}/></div>
            <div className="form-row"><label className="label" htmlFor="profile-specialty">التخصص</label><select className="field" id="profile-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)}><option value="">اختر تخصصًا</option>{SPECIALTIES.map((value) => <option key={value}>{value}</option>)}</select></div>
          </div>
          <div className="form-row"><label className="label" htmlFor="profile-bio">نبذة مهنية قصيرة</label><textarea className="field" id="profile-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={600} placeholder="خبرتك واهتماماتك المهنية…"/><span className="tiny muted">{bio.length}/600 حرفًا</span></div>
          <div className="row profile-edit-actions"><button className="btn btn-primary" disabled={busy} type="submit"><Save size={16}/>{busy ? "جارٍ الحفظ…" : "حفظ التغييرات"}</button><button className="btn" type="button" disabled={busy} onClick={() => { setDisplayName(user.display_name); setSpecialty(user.specialty || ""); setBio(user.bio || ""); setEditing(false); }}>إلغاء</button></div>
        </form>
        <p className="profile-security-note"><LockKeyhole size={15}/> لا يمكنك تعديل سنوات الخبرة أو الشارات المهنية المعتمدة؛ تراجع الإدارة مستنداتها قبل عرضها.</p>
      </section>}

      <div className="profile-content-grid">
        <div className="profile-main-column">
          <section className="card profile-info-card">
            <div className="profile-section-heading"><div><h2 className="section-title">نبذة</h2><p className="small muted">تعريف مختصر عنك ومجالات اهتمامك.</p></div><UserRound size={19} className="muted"/></div>
            {user.bio ? <p className="profile-bio-text">{user.bio}</p> : <div className="profile-empty-bio"><p>لم تضف نبذة مهنية بعد.</p><button className="btn btn-small" onClick={() => setEditing(true)}><PencilLine size={14}/> أضف نبذة</button></div>}
          </section>

          <section className="profile-posts-section">
            <div className="profile-section-heading profile-posts-heading"><div><h2 className="section-title">منشورات العضو</h2><p className="small muted">أحدث ما شاركته مع مجتمع المهندسين.</p></div><span className="pill navy">{formatCount(posts.length)} منشور</span></div>
            {posts.length ? <div className="profile-post-list">{posts.map((post) => <article key={post.id} className="card profile-post-card">
              <div className="profile-post-meta"><span>{post.specialty || user.specialty || "هندسة"}</span><span>·</span><time dateTime={post.created_at}>{formatDate(post.created_at)}</time></div>
              {post.body ? <p className="profile-post-body">{post.body}</p> : null}
              {post.has_image ? <a className="profile-post-image-link" href={`/api/posts/${post.id}/image`} target="_blank" rel="noreferrer" aria-label="فتح صورة المنشور"><img className="profile-post-image" src={`/api/posts/${post.id}/image`} alt="صورة مرفقة بالمنشور" loading="lazy"/></a> : null}
              <div className="profile-post-stats"><span><ThumbsUp size={14}/>{formatCount(post.like_count)} إعجاب</span><span><MessageCircle size={14}/>{formatCount(post.comment_count)} تعليق</span></div>
            </article>)}</div> : <div className="card profile-empty-posts"><div className="profile-empty-icon"><MessageCircle size={22}/></div><h3>لسه ما نشرتش أي محتوى</h3><p className="small muted">شارك سؤالًا أو تجربة من شغلك علشان تبدأ الحوار مع زملائك.</p><Link href="/feed#compose" className="btn btn-primary btn-small">إنشاء أول منشور</Link></div>}
          </section>
        </div>

        <aside className="profile-side-column">
          <section className="card profile-credentials-card">
            <div className="profile-section-heading"><div><h2 className="section-title">الاعتمادات المهنية</h2><p className="small muted">البيانات التي تمت مراجعتها فقط.</p></div><GraduationCap size={21} className="muted"/></div>
            {isMember ? <div className="profile-credential-list">
              <div className="profile-credential-row"><span className="profile-credential-label">المستوى المهني</span><span className="profile-credential-value"><span className="pill navy">{user.seniority_code}</span>{levelLabels[user.seniority_code] || "مستوى مهني"}</span>{levelDescriptions.has(user.seniority_code) ? <p>{levelDescriptions.get(user.seniority_code)}</p> : null}</div>
              {user.job_title ? <div className="profile-credential-row"><span className="profile-credential-label">المسمى الوظيفي</span><span className="profile-credential-value"><span className="pill gold">{user.verified_badges.includes("PM") ? "PM" : "موثّق"}</span>{user.job_title}</span></div> : null}
              {user.approved_years != null ? <div className="profile-credential-row"><span className="profile-credential-label">الخبرة المعتمدة</span><strong>{Number(user.approved_years).toLocaleString("ar-EG")} سنوات</strong></div> : null}
              <div className="profile-credential-row"><span className="profile-credential-label">المؤهلات والشهادات</span>{approvedBadges.length ? <div className="profile-verified-qualifications">{approvedBadges.map((code) => <div className="profile-qualification" key={code}><span className="pill navy">{code}</span><span>{badgeLabels.get(code)}</span></div>)}</div> : <p className="profile-no-qualifications">لا توجد مؤهلات إضافية معتمدة للعرض حاليًا.</p>}</div>
            </div> : <div className="profile-admin-note"><ShieldCheck size={22}/><div><strong>حساب إداري</strong><p>هذا الحساب مخصص لإدارة المجتمع ولا يعرض اعتمادات هندسية شخصية.</p></div></div>}
          </section>
          <div className="profile-privacy-note"><LockKeyhole size={18}/><div><strong>بياناتك تحت سيطرتك</strong><p>الشارات المهنية يعتمدها فريق الإدارة. رقم العضوية الحقيقي وملفات التوثيق لا تظهر للأعضاء.</p></div></div>
        </aside>
      </div>
    </main>

    <nav className="mobile-bottom profile-mobile-nav" aria-label="التنقل"><Link href="/feed"><UserRound size={17}/><span>الموجز</span></Link><Link href="/feed#compose" className="mobile-compose-link"><span className="profile-mobile-plus">+</span><span>منشور</span></Link><Link href="/notifications"><Bell size={17}/><span>الإشعارات</span></Link><Link href="/profile" className="active" aria-current="page"><UserRound size={17}/><span>حسابي</span></Link></nav>
  </div>;
}
