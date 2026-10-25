"use client";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck, BriefcaseBusiness, Camera, CalendarDays, Pin,
  GraduationCap, LockKeyhole, MessageCircle, PencilLine, Save, ShieldCheck,
  ThumbsUp, UserRound, X, Share2, Trash2,
} from "lucide-react";
import { AxisLogoMark } from "@/components/AxisLogoMark";
import type { SessionUser } from "@/lib/types";
import { BADGE_OPTIONS, GLOSSARY, SPECIALTIES } from "@/lib/constants";
import { ProfessionalBadges } from "@/components/ProfessionalIdentity";
import { Toast } from "@/components/Toast";
import { UserAvatar } from "@/components/UserAvatar";

export type ProfilePostPreview = {
  id: string;
  body: string;
  specialty: string | null;
  created_at: string;
  has_image: boolean;
  like_count: number;
  comment_count: number;
  shared_post_id: string | null;
  group_id?: string | null;
  pinned_at?: string | null;
  shared_body?: string | null;
  shared_created_at?: string | null;
  shared_has_image?: boolean | null;
  shared_display_name?: string | null;
  shared_author_id?: string | null;
  shared_avatar_color?: string | null;
  shared_has_avatar?: boolean;
  shared_specialty?: string | null;
  shared_profile_specialty?: string | null;
};

const levelLabels: Record<string, string> = {
  JNR: "مهندس مبتدئ",
  MID: "مهندس متوسط الخبرة",
  SNR: "مهندس أقدم",
  EXP: "خبير هندسي",
};
const badgeLabels = new Map<string, string>(BADGE_OPTIONS.map((badge) => [badge.code, badge.label] as const));
const levelDescriptions = new Map(GLOSSARY.map((item) => [item.code, item.description]));

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
function formatCount(value: number) {
  return new Intl.NumberFormat("ar-EG-u-nu-latn", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

export function ProfileClient({ initialUser, initialPosts }: { initialUser: SessionUser; initialPosts: ProfilePostPreview[] }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [displayName, setDisplayName] = useState(initialUser.display_name);
  const [specialty, setSpecialty] = useState(initialUser.specialty || "");
  const [bio, setBio] = useState(initialUser.bio || "");
  const [posts, setPosts] = useState(initialPosts);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostBody, setEditPostBody] = useState("");
  const [editPostSpecialty, setEditPostSpecialty] = useState("");
  const [postActionBusyId, setPostActionBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState<"avatar" | "cover" | null>(null);
  const [mediaRevision, setMediaRevision] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const isMember = user.role === "member";
  const approvedBadges = isMember ? user.verified_badges.filter((code) => badgeLabels.has(code)) : [];

  function beginPostEdit(post: ProfilePostPreview) {
    setEditingPostId(post.id);
    setEditPostBody(post.body || "");
    setEditPostSpecialty(post.specialty || "");
    setError("");
    setSuccess("");
  }

  async function savePostEdit(event: FormEvent<HTMLFormElement>, post: ProfilePostPreview) {
    event.preventDefault();
    if (postActionBusyId) return;
    const body = editPostBody.trim();
    if (!body && !post.has_image && !post.shared_post_id) {
      setError("اكتب محتوى قبل ما تحفظ التعديل.");
      return;
    }
    setPostActionBusyId(post.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, specialty: editPostSpecialty }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ما قدرناش نحفظ تعديل المشاركة.");
      setPosts(old => old.map(item => item.id === post.id
        ? { ...item, body: data.post.body, specialty: data.post.specialty }
        : item));
      setEditingPostId(null);
      setEditPostBody("");
      setSuccess("اتحفظ تعديل المشاركة.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ما قدرناش نحفظ تعديل المشاركة.");
    } finally {
      setPostActionBusyId(null);
    }
  }

  async function deleteProfilePost(post: ProfilePostPreview) {
    if (postActionBusyId || !window.confirm("متأكد إنك عايز تحذف المشاركة نهائيًا؟")) return;
    setPostActionBusyId(post.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ما قدرناش نحذف المشاركة.");
      setPosts(old => old.filter(item => item.id !== post.id));
      if (editingPostId === post.id) setEditingPostId(null);
      setSuccess("اتحذفت المشاركة.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ما قدرناش نحذف المشاركة.");
    } finally {
      setPostActionBusyId(null);
    }
  }

  async function toggleProfilePin(post: ProfilePostPreview) {
    if (postActionBusyId || post.group_id) return;
    const nextPinned = !post.pinned_at;
    setPostActionBusyId(post.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/posts/${post.id}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: nextPinned }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نثبت البوست. جرّب تاني.");
      setPosts(old => old.map(item => {
        if (item.id === post.id) return { ...item, pinned_at: payload.pinned_at || null };
        if (payload.pinned && !item.group_id) return { ...item, pinned_at: null };
        return item;
      }).sort((a, b) => Number(Boolean(b.pinned_at && !b.group_id)) - Number(Boolean(a.pinned_at && !a.group_id)) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setSuccess(payload.pinned ? "ثبتنا البوست على ملفك الشخصي." : "اتشال تثبيت البوست من ملفك.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ما قدرناش نثبت البوست. جرّب تاني.");
    } finally {
      setPostActionBusyId(null);
    }
  }

  async function uploadProfileMedia(kind: "avatar" | "cover", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const maxBytes = kind === "cover" ? 4_000_000 : 2_000_000;
    if (!file.type.startsWith("image/") || file.size > maxBytes) {
      setError(kind === "cover" ? "اختار صورة غلاف بصيغة JPG أو PNG أو WebP وحجم أقل من 4 ميجابايت." : "اختار صورة شخصية بصيغة JPG أو PNG أو WebP وحجم أقل من 2 ميجابايت.");
      event.target.value = "";
      return;
    }
    setMediaBusy(kind); setError(""); setSuccess("");
    const data = new FormData(); data.set("kind", kind); data.set("file", file);
    try {
      const response = await fetch("/api/me/media", { method: "POST", body: data });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نحفظ الصورة. جرّب تاني.");
      setUser(old => ({ ...old, has_avatar: Boolean(payload.has_avatar), has_cover: Boolean(payload.has_cover), updated_at: payload.updated_at || new Date().toISOString() }));
      setMediaRevision(Date.now());
      router.refresh();
      setSuccess(kind === "avatar" ? "صورتك الشخصية اتحدّثت بنجاح." : "صورة الغلاف اتحدّثت بنجاح.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ما قدرناش نحفظ الصورة. جرّب تاني.");
    } finally {
      setMediaBusy(null); event.target.value = "";
    }
  }

  async function removeProfileMedia(kind: "avatar" | "cover") {
    if (!user[kind === "avatar" ? "has_avatar" : "has_cover"] || mediaBusy) return;
    if (!window.confirm(kind === "avatar" ? "تشيل صورتك الشخصية وترجع للأحرف؟" : "تشيل صورة الغلاف؟")) return;
    setMediaBusy(kind); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/me/media?kind=${kind}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نشيل الصورة. جرّب تاني.");
      setUser(old => ({ ...old, has_avatar: Boolean(payload.has_avatar), has_cover: Boolean(payload.has_cover), updated_at: payload.updated_at || new Date().toISOString() }));
      setMediaRevision(Date.now());
      router.refresh();
      setSuccess(kind === "avatar" ? "اتشالت صورتك الشخصية." : "اتشالت صورة الغلاف.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ما قدرناش نشيل الصورة. جرّب تاني.");
    } finally { setMediaBusy(null); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, specialty, bio }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ما قدرناش نحفظ التعديلات. جرّب تاني.");
      setUser(data.user); setSuccess("اتحدّث حسابك بنجاح."); setEditing(false); router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حصلت مشكلة وإحنا بنحفظ التعديلات.");
    } finally { setBusy(false); }
  }

  return <div className="profile-page profile-in-shell">
      <Toast message={error} error />
      <Toast message={success} />

      <section className="card profile-hero-card">
        <input ref={avatarInputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void uploadProfileMedia("avatar", event)}/>
        <input ref={coverInputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void uploadProfileMedia("cover", event)}/>
        <div className="profile-cover" aria-label="صورة غلاف الملف الشخصي">
          {user.has_cover ? <img className="profile-cover-photo" src={`/api/people/${encodeURIComponent(user.id)}/media?kind=cover&v=${mediaRevision || encodeURIComponent(String(user.updated_at || "1"))}`} alt=""/> : null}
          <AxisLogoMark className="profile-cover-mark" title=""/>
          <div className="profile-cover-controls"><button type="button" className="btn btn-small" onClick={() => coverInputRef.current?.click()} disabled={mediaBusy !== null}><Camera size={14}/>{mediaBusy === "cover" ? "جارٍ الرفع…" : user.has_cover ? "تغيير الغلاف" : "إضافة غلاف"}</button>{user.has_cover && <button type="button" className="btn btn-small btn-danger" onClick={() => void removeProfileMedia("cover")} disabled={mediaBusy !== null}>إزالة</button>}</div>
        </div>
        <div className="profile-hero-details">
          <div className="profile-identity">
            <div className="profile-avatar-wrap"><UserAvatar userId={user.id} displayName={user.display_name} avatarColor={user.avatar_color} hasAvatar={user.has_avatar} version={mediaRevision || user.updated_at} className="profile-avatar"/><button type="button" className="profile-avatar-edit" onClick={() => avatarInputRef.current?.click()} disabled={mediaBusy !== null} aria-label={mediaBusy === "avatar" ? "جارٍ رفع الصورة الشخصية" : "تغيير الصورة الشخصية"} title={mediaBusy === "avatar" ? "جارٍ الرفع…" : "تغيير الصورة الشخصية"}>{mediaBusy === "avatar" ? <span className="profile-media-spinner" aria-hidden="true"/> : <Camera size={15}/>}</button></div>
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

      <p className="profile-media-hint">تقدر تغيّر الصورة الشخصية أو الغلاف مباشرة من هنا. الصور بتتظبط تلقائيًا لتناسب العرض. الأنواع المدعومة JPG وPNG وWebP.</p>

      {editing && <section id="profile-edit-panel" className="card profile-edit-panel">
        <div className="profile-section-heading"><div><h2 className="section-title">عدّل بياناتك</h2><p className="small muted">غيّر اسمك أو تخصصك أو النبذة اللي زملاؤك بيشوفوها.</p></div><PencilLine size={19} className="muted"/></div>
        <form className="form-stack" onSubmit={save}>
          <div className="form-grid">
            <div className="form-row"><label className="label" htmlFor="profile-name">اسم الظهور</label><input className="field" id="profile-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} maxLength={80}/></div>
            <div className="form-row"><label className="label" htmlFor="profile-specialty">التخصص</label><select className="field" id="profile-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)}><option value="">اختار تخصصك</option>{SPECIALTIES.map((value) => <option key={value}>{value}</option>)}</select></div>
          </div>
          <div className="form-row"><label className="label" htmlFor="profile-bio">نبذة عنك</label><textarea className="field" id="profile-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={600} placeholder="احكيلنا شوية عنك وعن الحاجات اللي بتحب تتكلم فيها…"/><span className="tiny muted">{bio.length}/600 حرفًا</span></div>
          <div className="row profile-edit-actions"><button className="btn btn-primary" disabled={busy} type="submit"><Save size={16}/>{busy ? "جارٍ الحفظ…" : "حفظ التغييرات"}</button><button className="btn" type="button" disabled={busy} onClick={() => { setDisplayName(user.display_name); setSpecialty(user.specialty || ""); setBio(user.bio || ""); setEditing(false); }}>إلغاء</button></div>
        </form>
        <p className="profile-security-note"><LockKeyhole size={15}/> بيانات التحقق بتظهر بعد مراجعتها، علشان الأعضاء يعرفوا إيه اللي اتأكدنا منه.</p>
      </section>}

      <div className="profile-content-grid">
        <div className="profile-main-column">
          <section className="card profile-info-card">
            <div className="profile-section-heading"><div><h2 className="section-title">نبذة</h2><p className="small muted">تعريف مختصر عنك ومجالات اهتمامك.</p></div><UserRound size={19} className="muted"/></div>
            {user.bio ? <p className="profile-bio-text">{user.bio}</p> : <div className="profile-empty-bio"><p>لسه ما كتبتش نبذة عنك.</p><button className="btn btn-small" onClick={() => setEditing(true)}><PencilLine size={14}/> اكتب نبذة عنك</button></div>}
          </section>

          <section className="profile-posts-section">
            <div className="profile-section-heading profile-posts-heading"><div><h2 className="section-title">بوستاتي</h2><p className="small muted">كل البوستات اللي نزلتها هتلاقيها هنا.</p></div><span className="pill navy">{formatCount(posts.length)} منشور</span></div>
            {posts.length ? <div className="profile-post-list">{posts.map((post) => <article key={post.id} className="card profile-post-card">
              <div className="profile-post-meta"><span>{post.specialty || user.specialty || "هندسة"}</span><span>·</span><time dateTime={post.created_at}>{formatDate(post.created_at)}</time></div>
              {post.pinned_at && !post.group_id && <div className="post-pinned-badge"><Pin size={14}/> مثبت على الملف الشخصي</div>}
              <div className="profile-post-manage-actions">
                {editingPostId !== post.id && <button type="button" className="btn btn-small" onClick={() => beginPostEdit(post)} disabled={Boolean(postActionBusyId)}><PencilLine size={14}/> تعديل</button>}
                {!post.group_id && <button type="button" className="btn btn-small" onClick={() => void toggleProfilePin(post)} disabled={Boolean(postActionBusyId)}><Pin size={14}/>{postActionBusyId === post.id ? "جارٍ التثبيت…" : post.pinned_at ? "إلغاء التثبيت" : "تثبيت على ملفي"}</button>}
                <button type="button" className="btn btn-small btn-danger" onClick={() => void deleteProfilePost(post)} disabled={postActionBusyId === post.id}><Trash2 size={14}/>{postActionBusyId === post.id ? "جارٍ الحذف…" : "حذف"}</button>
              </div>
              {editingPostId === post.id ? <form className="profile-post-edit-form" onSubmit={event => void savePostEdit(event, post)}>
                <label className="sr-only" htmlFor={`profile-post-edit-${post.id}`}>تعديل نص المشاركة</label>
                <textarea id={`profile-post-edit-${post.id}`} className="field" rows={4} maxLength={5000} value={editPostBody} onChange={event => setEditPostBody(event.target.value)} />
                <label className="form-row"><span className="label">التخصص</span><select className="field" value={editPostSpecialty} onChange={event => setEditPostSpecialty(event.target.value)}><option value="">بدون تخصص</option>{SPECIALTIES.map(item => <option key={item}>{item}</option>)}</select></label>
                <div className="row"><button type="submit" className="btn btn-primary btn-small" disabled={postActionBusyId === post.id || (!editPostBody.trim() && !post.has_image && !post.shared_post_id)}><Save size={14}/>{postActionBusyId === post.id ? "جارٍ الحفظ…" : "حفظ التعديل"}</button><button type="button" className="btn btn-small" disabled={postActionBusyId === post.id} onClick={() => { setEditingPostId(null); setEditPostBody(""); }}>إلغاء</button></div>
              </form> : post.body ? <p className="profile-post-body">{post.body}</p> : null}
              {post.shared_post_id && post.shared_display_name && <div className="shared-post-shell profile-shared-post-shell">
                <div className="shared-post-attribution"><Share2 size={14}/><span>شاركت منشور {post.shared_display_name}</span></div>
                <article className="shared-post-original">
                  <header className="shared-post-original-header"><UserAvatar userId={post.shared_author_id} displayName={post.shared_display_name} avatarColor={post.shared_avatar_color} hasAvatar={post.shared_has_avatar} className="sm"/><div className="user-meta"><strong>{post.shared_display_name}</strong><span className="small muted">{post.shared_specialty || post.shared_profile_specialty || "من مجتمع AXIS"}</span></div>{post.shared_created_at && <time className="tiny muted" dateTime={post.shared_created_at}>{formatDate(post.shared_created_at)}</time>}</header>
                  {post.shared_body && <p className="shared-post-original-body">{post.shared_body}</p>}
                  {post.shared_has_image && <a className="shared-post-original-media" href={`/api/posts/${post.shared_post_id}/image`} target="_blank" rel="noreferrer" aria-label="فتح صورة المنشور الأصلي"><img src={`/api/posts/${post.shared_post_id}/image`} alt={`صورة من منشور ${post.shared_display_name}`} loading="lazy"/></a>}
                </article>
              </div>}
              {post.has_image ? <a className="profile-post-image-link" href={`/api/posts/${post.id}/image`} target="_blank" rel="noreferrer" aria-label="فتح صورة المنشور"><img className="profile-post-image" src={`/api/posts/${post.id}/image`} alt="صورة مرفقة بالمنشور" loading="lazy"/></a> : null}
              <div className="profile-post-stats"><span><ThumbsUp size={14}/>{formatCount(post.like_count)} إعجاب</span><span><MessageCircle size={14}/>{formatCount(post.comment_count)} تعليق</span><Link className="btn btn-small" href={`/feed?post=${encodeURIComponent(post.id)}`}>عرض النقاش</Link></div>
            </article>)}</div> : <div className="card profile-empty-posts"><div className="profile-empty-icon"><MessageCircle size={22}/></div><h3>لسه ما شاركتش حاجة</h3><p className="small muted">ابدأ بسؤال، موقف حصل معاك، أو موضوع حابب تسمع رأي الناس فيه.</p><Link href="/feed#compose" className="btn btn-primary btn-small">أول بوست ليك</Link></div>}
          </section>
        </div>

        <aside className="profile-side-column">
          <section className="card profile-credentials-card">
            <div className="profile-section-heading"><div><h2 className="section-title">معلومات متوثّقة</h2><p className="small muted">اللي تم التأكد منه بس.</p></div><GraduationCap size={21} className="muted"/></div>
            {isMember ? <div className="profile-credential-list">
              <div className="profile-credential-row"><span className="profile-credential-label">مستوى الخبرة</span><span className="profile-credential-value"><span className="pill navy">{user.seniority_code}</span>{levelLabels[user.seniority_code] || "مستوى الخبرة"}</span>{levelDescriptions.has(user.seniority_code) ? <p>{levelDescriptions.get(user.seniority_code)}</p> : null}</div>
              {user.job_title ? <div className="profile-credential-row"><span className="profile-credential-label">المسمى الوظيفي</span><span className="profile-credential-value"><span className="pill gold">{user.verified_badges.includes("PM") ? "PM" : "موثّق"}</span>{user.job_title}</span></div> : null}
              {user.approved_years != null ? <div className="profile-credential-row"><span className="profile-credential-label">الخبرة المعتمدة</span><strong>{Number(user.approved_years).toLocaleString("ar-EG-u-nu-latn")} سنوات</strong></div> : null}
              <div className="profile-credential-row"><span className="profile-credential-label">المؤهلات والشهادات</span>{approvedBadges.length ? <div className="profile-verified-qualifications">{approvedBadges.map((code) => <div className="profile-qualification" key={code}><span className="pill navy">{code}</span><span>{badgeLabels.get(code)}</span></div>)}</div> : <p className="profile-no-qualifications">مفيش مؤهلات إضافية تم اعتمادها لعرضها دلوقتي.</p>}</div>
            </div> : <div className="profile-admin-note"><ShieldCheck size={22}/><div><strong>حساب إداري</strong><p>هذا الحساب مخصص لإدارة المجتمع ولا يعرض اعتمادات هندسية شخصية.</p></div></div>}
          </section>
          <div className="profile-privacy-note"><LockKeyhole size={18}/><div><strong>خلي بالك من خصوصيتك</strong><p>مستندات إثبات العضوية مش ظاهرة لباقي الأعضاء. حسابك وبوستاتك بيظهروا باسم حسابك؛ ما تنشرش معلومات حساسة.</p></div></div>
        </aside>
      </div>
    </div>;
}
