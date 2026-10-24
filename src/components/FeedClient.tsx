"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MessageCircle, ThumbsUp, ImagePlus, Send, MoreHorizontal, Flag, Trash2, Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProfessionalBadges } from "@/components/ProfessionalIdentity";
import { Toast } from "@/components/Toast";
import { SPECIALTIES } from "@/lib/constants";
import type { EngineeringEvent, FeedComment, FeedPost, SessionUser } from "@/lib/types";

export function FeedClient({ user }: { user: SessionUser }) {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [events, setEvents] = useState<EngineeringEvent[]>([]);
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState(false);
  const q = searchParams.get("q") || "";
  const [filter, setFilter] = useState(searchParams.get("specialty") || "");

  const load = useCallback(async () => {
    const params = new URLSearchParams(); if (q) params.set("q", q); if (filter) params.set("specialty", filter);
    const [feedResponse, eventResponse] = await Promise.all([fetch(`/api/feed?${params.toString()}`, { cache: "no-store" }), fetch("/api/events", { cache: "no-store" })]);
    if (feedResponse.status === 401 || feedResponse.status === 403) { window.location.href = "/verification"; return; }
    const feedData = await feedResponse.json(); const eventData = await eventResponse.json();
    if (feedResponse.ok) setPosts(feedData.posts || []); else setError(feedData.error || "تعذر تحميل المنشورات.");
    if (eventResponse.ok) setEvents(eventData.events || []);
  }, [q, filter]);
  useEffect(() => { void load(); }, [load]);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    const data = new FormData(); data.set("body", body); data.set("specialty", specialty || user.specialty || ""); if (image) data.set("image", image);
    try { const res = await fetch("/api/feed", { method: "POST", body: data }); const json = await res.json(); if (!res.ok) throw new Error(json.error || "تعذر نشر المنشور."); setBody(""); setImage(null); setSpecialty(""); const input = document.getElementById("post-image") as HTMLInputElement | null; if (input) input.value = ""; setSuccess("تم نشر منشورك."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "حدث خطأ."); } finally { setBusy(false); }
  }

  async function toggleLike(post: FeedPost) {
    const response = await fetch(`/api/posts/${post.id}/like`, { method: "POST" }); const data = await response.json();
    if (response.ok) setPosts(old => old.map(item => item.id === post.id ? { ...item, has_liked: data.liked, like_count: data.likeCount } : item)); else setError(data.error || "تعذر تسجيل الإعجاب.");
  }

  async function toggleComments(post: FeedPost) {
    if (openComments === post.id) { setOpenComments(null); return; }
    setOpenComments(post.id);
    const response = await fetch(`/api/posts/${post.id}/comments`, { cache: "no-store" }); const data = await response.json();
    if (response.ok) setComments(old => ({ ...old, [post.id]: data.comments || [] })); else setError(data.error || "تعذر تحميل التعليقات.");
  }

  async function addComment(postId: string) {
    const draft = commentDrafts[postId]?.trim(); if (!draft) return; setCommentBusy(true); setError("");
    try { const res = await fetch(`/api/posts/${postId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: draft }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "تعذر إضافة التعليق."); setComments(old => ({ ...old, [postId]: [...(old[postId] || []), data.comment] })); setCommentDrafts(old => ({ ...old, [postId]: "" })); setPosts(old => old.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)); }
    catch (e) { setError(e instanceof Error ? e.message : "حدث خطأ."); } finally { setCommentBusy(false); }
  }

  async function reportPost(postId: string) {
    const reason = window.prompt("سبب الإبلاغ عن المنشور؟"); if (!reason) return;
    const res = await fetch(`/api/posts/${postId}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }); const data = await res.json();
    if (res.ok) setSuccess("تم إرسال البلاغ إلى الإدارة."); else setError(data.error || "تعذر إرسال البلاغ.");
  }
  async function deletePost(post: FeedPost) {
    if (post.author_id !== user.id || !window.confirm("حذف هذا المنشور نهائيًا؟")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" }); const data = await res.json();
    if (res.ok) setPosts(old => old.filter(p => p.id !== post.id)); else setError(data.error || "تعذر حذف المنشور.");
  }

  return <AppShell user={user} events={events} active="/feed">
    <div className="between"><div><h1 className="page-title">الموجز</h1><p className="small muted" style={{ margin: 0 }}>مساحة واحدة تجمع المهندسين وتبادل الخبرات.</p></div><span className="pill navy">ENGINEERS ONLY</span></div>
    <Toast message={error} error/><Toast message={success}/>
    <form className="card compose" onSubmit={createPost}>
      <div className="user-line"><div className="avatar">{user.display_name.slice(0,1)}</div><div className="user-meta"><div className="user-name">{user.display_name}{user.role === "member" ? <ProfessionalBadges level={user.seniority_code} badges={user.verified_badges} compact/> : <span className="pill navy">إدارة AXIS</span>}</div><div className="user-sub">منشورك سيظهر للمهندسين الموثقين</div></div></div>
      <textarea className="field" style={{ minHeight: 94, border: 0, background: "#FBFCFD" }} value={body} onChange={e => setBody(e.target.value)} maxLength={5000} placeholder="شارك فكرة هندسية أو تجربة من موقع العمل…" aria-label="نص المنشور"/>
      {image && <div className="alert">الصورة جاهزة: {image.name} <button type="button" className="btn btn-small" onClick={() => setImage(null)}>إزالة</button></div>}
      <div className="between"><div className="row" style={{ flexWrap: "wrap" }}><label className="btn btn-ghost btn-small" htmlFor="post-image"><ImagePlus size={16}/> صورة</label><input className="hidden" type="file" id="post-image" accept="image/jpeg,image/png,image/webp" onChange={e => setImage(e.target.files?.[0] || null)}/><select className="field" style={{ minHeight: 34, padding: "5px 8px", width: "auto", fontSize: 12 }} value={specialty} onChange={e => setSpecialty(e.target.value)} aria-label="تخصص المنشور"><option value="">تخصص المنشور</option>{SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div><button type="submit" className="btn btn-primary btn-small" disabled={busy || (!body.trim() && !image)}>{busy ? "جارٍ النشر…" : "نشر"}</button></div>
    </form>

    <div className="card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><SlidersHorizontal size={17} className="muted"/><strong className="small">الفلاتر</strong><button className={`btn btn-small ${!filter ? "btn-primary" : ""}`} onClick={() => setFilter("")}>الكل</button>{SPECIALTIES.slice(0, 6).map(s => <button className={`btn btn-small ${filter === s ? "btn-primary" : ""}`} key={s} onClick={() => setFilter(filter === s ? "" : s)}>{s}</button>)}{q && <span className="pill">بحث: {q}</span>}</div>

    {posts.length === 0 ? <div className="empty-state"><Search size={25} style={{ marginBottom: 8 }}/><h2 className="section-title">لسه مفيش منشورات هنا</h2><p className="small">كن أول من يشارك موضوعًا هندسيًا مع المجتمع.</p></div> : posts.map(post => <article className="card post" key={post.id}>
      <div className="between"><div className="user-line"><div className="avatar">{post.display_name.slice(0,1)}</div><div className="user-meta"><div className="user-name"><span>{post.display_name}</span>{post.author_role === "member" ? <ProfessionalBadges level={post.seniority_code} badges={post.verified_badges} compact/> : <span className="pill navy">إدارة AXIS</span>}</div><div className="user-sub">{post.job_title || `مهندس ${post.specialty || ""}`} · {new Date(post.created_at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</div></div></div><div className="row"><button className="icon-btn" title="إبلاغ عن المنشور" onClick={() => reportPost(post.id)}><Flag size={16}/></button>{post.author_id === user.id && <button className="icon-btn" title="حذف المنشور" onClick={() => deletePost(post)}><Trash2 size={16}/></button>}<MoreHorizontal size={18} className="muted"/></div></div>
      {post.body && <div className="post-body">{post.body}</div>}{post.has_image && <img className="post-image" src={`/api/posts/${post.id}/image`} alt="صورة مرفقة بالمنشور" loading="lazy"/>}
      <div className="between small muted"><span>{post.like_count} إعجاب</span><span>{post.comment_count} تعليق</span></div><hr className="divider"/><div className="post-actions"><button className={`post-action ${post.has_liked ? "liked" : ""}`} onClick={() => toggleLike(post)}><ThumbsUp size={17}/>{post.has_liked ? "أعجبك" : "إعجاب"}</button><button className="post-action" onClick={() => toggleComments(post)}><MessageCircle size={17}/>تعليق ({post.comment_count})</button></div>
      {openComments === post.id && <div className="comments">{(comments[post.id] || []).map(comment => <div className="comment" key={comment.id}><div className="avatar sm">{comment.display_name.slice(0,1)}</div><div className="comment-body"><div className="user-name">{comment.display_name}{comment.author_role === "member" ? <ProfessionalBadges level={comment.seniority_code} badges={comment.verified_badges} compact/> : <span className="pill navy">إدارة AXIS</span>}</div><div className="small">{comment.body}</div><div className="tiny muted">{new Date(comment.created_at).toLocaleString("ar-EG")}</div></div></div>)}<div className="row"><input className="field" style={{ minHeight: 40 }} value={commentDrafts[post.id] || ""} onChange={e => setCommentDrafts(old => ({ ...old, [post.id]: e.target.value }))} maxLength={1200} placeholder="اكتب تعليقًا…"/><button className="btn btn-primary btn-small" disabled={commentBusy || !(commentDrafts[post.id] || "").trim()} onClick={() => addComment(post.id)} aria-label="إرسال التعليق"><Send size={16}/></button></div></div>}
    </article>)}
    <div className="footer-note">AXIS · مجتمع مهني مغلق للمهندسين</div>
  </AppShell>;
}
