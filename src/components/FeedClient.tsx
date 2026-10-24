"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  BadgeCheck,
  Camera,
  CalendarDays,
  CheckCircle2,
  Flag,
  ImagePlus,
  Heart,
  CornerDownLeft,
  Share2,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  ThumbsUp,
  Trash2,
  X,
  UserRound,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AxisLogoMark } from "@/components/AxisLogoMark";
import { ProfessionalBadges } from "@/components/ProfessionalIdentity";
import { Toast } from "@/components/Toast";
import { SPECIALTIES } from "@/lib/constants";
import type { EngineeringEvent, FeedComment, FeedPost, SessionUser } from "@/lib/types";

function formatPostTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const elapsed = Math.max(0, Date.now() - date.getTime());
  if (elapsed < 60_000) return "الآن";
  if (elapsed < 3_600_000) return `منذ ${Math.floor(elapsed / 60_000)} د`;
  if (elapsed < 86_400_000) return `منذ ${Math.floor(elapsed / 3_600_000)} س`;
  if (elapsed < 7 * 86_400_000) return `منذ ${Math.floor(elapsed / 86_400_000)} يوم`;
  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: elapsed > 365 * 86_400_000 ? "numeric" : undefined });
}

function PostSkeleton() {
  return (
    <article className="card post-skeleton" aria-label="جارٍ تحميل المنشورات">
      <div className="skeleton-author"><span className="skeleton-block skeleton-avatar"/><span className="skeleton-author-lines"><i className="skeleton-block"/><i className="skeleton-block"/></span></div>
      <i className="skeleton-block skeleton-line"/><i className="skeleton-block skeleton-line short"/>
      <div className="skeleton-actions"><i className="skeleton-block"/><i className="skeleton-block"/></div>
    </article>
  );
}

export function FeedClient({ user }: { user: SessionUser }) {
  const searchParams = useSearchParams();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const didLoadRef = useRef(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [events, setEvents] = useState<EngineeringEvent[]>([]);
  const [body, setBody] = useState("");
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState(false);
  const [busyLikePostId, setBusyLikePostId] = useState<string | null>(null);
  const [busyLikeCommentId, setBusyLikeCommentId] = useState<string | null>(null);
  const [replyTargets, setReplyTargets] = useState<Record<string, FeedComment | null>>({});
  const [openMenuPost, setOpenMenuPost] = useState<string | null>(null);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [sharingPost, setSharingPost] = useState<FeedPost | null>(null);
  const [shareCaption, setShareCaption] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const q = searchParams.get("q") || "";
  const sharedPostId = searchParams.get("post") || "";
  const [filter, setFilter] = useState(searchParams.get("specialty") || "");

  useEffect(() => {
    if (!image) { setImagePreview(null); return; }
    const previewUrl = URL.createObjectURL(image);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [image]);

  const load = useCallback(async () => {
    if (didLoadRef.current) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filter) params.set("specialty", filter);
    if (sharedPostId) params.set("post", sharedPostId);
    try {
      const [feedResponse, eventResponse] = await Promise.all([
        fetch(`/api/feed?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/events", { cache: "no-store" }),
      ]);
      if (feedResponse.status === 401) { window.location.href = "/login"; return; }
      if (feedResponse.status === 403) { window.location.href = "/verification"; return; }
      const feedData = await feedResponse.json();
      const eventData = eventResponse.ok ? await eventResponse.json() : { events: [] };
      if (!feedResponse.ok) throw new Error(feedData.error || "مش قادرين نحمّل المشاركات دلوقتي. جرّب تحدّث الصفحة.");
      setPosts(Array.isArray(feedData.posts) ? feedData.posts : []);
      setEvents(Array.isArray(eventData.events) ? eventData.events : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "الاتصال فصل لحظة. جرّب تاني، ومشاركاتك هتفضل زي ما هي.");
    } finally {
      didLoadRef.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [q, filter, sharedPostId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!isLoading && sharedPostId) {
      document.getElementById(`post-${sharedPostId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isLoading, posts, sharedPostId]);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess(""); setBusy(true);
    const data = new FormData();
    data.set("body", body);
    data.set("specialty", specialty || user.specialty || "");
    if (image) data.set("image", image);
    try {
      const response = await fetch("/api/feed", { method: "POST", body: data });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش ننشر المشاركة. جرّب تاني.");
      setBody(""); setImage(null); setSpecialty(""); setComposerExpanded(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      setSuccess("اتنشرت مشاركتك بنجاح 🙌");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ما قدرناش ننشر المشاركة. اتأكد من اتصالك وجرّب تاني.");
    } finally { setBusy(false); }
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] || null;
    if (chosen && chosen.size > 2_000_000) {
      setError("الصورة كبيرة شوية؛ اختار صورة أصغر من 2 ميجابايت.");
      event.target.value = "";
      return;
    }
    setError("");
    setImage(chosen);
    if (chosen) setComposerExpanded(true);
  }

  async function toggleLike(post: FeedPost) {
    if (busyLikePostId) return;
    setBusyLikePostId(post.id);
    try {
      const response = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نسجل إعجابك دلوقتي. جرّب تاني.");
      setPosts(old => old.map(item => item.id === post.id ? { ...item, has_liked: payload.liked, like_count: payload.likeCount } : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ما قدرناش نسجل إعجابك دلوقتي. جرّب تاني."); }
    finally { setBusyLikePostId(null); }
  }

  async function toggleComments(post: FeedPost) {
    setError("");
    if (openComments === post.id) { setOpenComments(null); return; }
    setOpenComments(post.id);
    if (comments[post.id]) return;
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "التعليقات مش ظاهرة دلوقتي. جرّب تفتحها تاني.");
      setComments(old => ({ ...old, [post.id]: Array.isArray(payload.comments) ? payload.comments : [] }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "التعليقات مش ظاهرة دلوقتي. جرّب تفتحها تاني."); }
  }

  async function addComment(postId: string, event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const draft = commentDrafts[postId]?.trim();
    const replyTarget = replyTargets[postId] || null;
    if (!draft || commentBusy) return;
    setCommentBusy(true); setError("");
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft, parentCommentId: replyTarget?.id || null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "التعليق ما اتبعتش. جرّب تاني.");
      setComments(old => ({ ...old, [postId]: [...(old[postId] || []), payload.comment] }));
      setCommentDrafts(old => ({ ...old, [postId]: "" }));
      setReplyTargets(old => ({ ...old, [postId]: null }));
      setPosts(old => old.map(post => post.id === postId ? { ...post, comment_count: post.comment_count + 1 } : post));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "التعليق ما اتبعتش. جرّب تاني."); }
    finally { setCommentBusy(false); }
  }

  async function toggleLikeComment(postId: string, comment: FeedComment) {
    if (busyLikeCommentId) return;
    setBusyLikeCommentId(comment.id);
    try {
      const response = await fetch(`/api/comments/${comment.id}/like`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نسجل إعجابك بالتعليق. جرّب تاني.");
      setComments(old => ({
        ...old,
        [postId]: (old[postId] || []).map(item => item.id === comment.id
          ? { ...item, has_liked: Boolean(payload.hasLiked ?? payload.liked), like_count: Number(payload.likeCount) || 0 }
          : item),
      }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ما قدرناش نسجل إعجابك بالتعليق. جرّب تاني."); }
    finally { setBusyLikeCommentId(null); }
  }

  function sharePost(post: FeedPost) {
    setError("");
    setShareCaption("");
    setSharingPost(post);
  }

  async function confirmInternalShare() {
    if (!sharingPost || shareBusy) return;
    setShareBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/posts/${sharingPost.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: shareCaption.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نشارك المنشور على حسابك. جرّب تاني.");
      setSharingPost(null);
      setShareCaption("");
      setSuccess("اتشارك المنشور على ملفك الشخصي، وبقى ظاهر لزملائك في الرئيسية.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ما قدرناش نشارك المنشور دلوقتي. جرّب تاني.");
    } finally {
      setShareBusy(false);
    }
  }

  async function deleteComment(postId: string, comment: FeedComment, thread: FeedComment[]) {
    if (comment.author_id !== user.id && user.role !== "admin") return;
    if (!window.confirm("تحب تحذف التعليق ده وكل الردود اللي تحته؟")) return;
    try {
      const response = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نحذف التعليق دلوقتي. جرّب تاني.");
      const removedIds = new Set<string>([comment.id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const item of thread) {
          if (item.parent_comment_id && removedIds.has(item.parent_comment_id) && !removedIds.has(item.id)) {
            removedIds.add(item.id);
            changed = true;
          }
        }
      }
      setComments(old => ({ ...old, [postId]: (old[postId] || []).filter(item => !removedIds.has(item.id)) }));
      setPosts(old => old.map(post => post.id === postId ? { ...post, comment_count: Math.max(0, post.comment_count - removedIds.size) } : post));
      setSuccess("اتحذف التعليق والردود التابعة له.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ما قدرناش نحذف التعليق دلوقتي. جرّب تاني."); }
  }

  async function reportPost(postId: string) {
    const reason = reportReason.trim();
    if (reason.length < 3) { setError("قول لنا إيه المشكلة في المنشور."); return; }
    setError("");
    try {
      const response = await fetch(`/api/posts/${postId}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "البلاغ ما اتبعتش. جرّب تاني.");
      setReportingPostId(null); setReportReason(""); setSuccess("وصل بلاغك لفريق AXIS، وهيتراجع.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "البلاغ ما اتبعتش. جرّب تاني."); }
  }

  async function deletePost(post: FeedPost) {
    if (post.author_id !== user.id || !window.confirm("متأكد إنك عايز تحذف المنشور نهائيًا؟")) return;
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نحذف المنشور دلوقتي. جرّب تاني.");
      setPosts(old => old.filter(item => item.id !== post.id));
      setOpenMenuPost(null);
      setSuccess("اتحذف المنشور.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ما قدرناش نحذف المنشور دلوقتي. جرّب تاني."); }
  }

  function renderComment(postId: string, comment: FeedComment, thread: FeedComment[], depth = 0): ReactNode {
    const replies = thread.filter(item => item.parent_comment_id === comment.id);
    return (
      <div className={`comment-thread ${depth > 0 ? "comment-thread-reply" : ""}`} key={comment.id}>
        <div className="comment comment-professional">
          <div className="avatar sm comment-avatar" style={{ background: comment.avatar_color || "var(--blue)" }}>{comment.display_name.slice(0, 1)}</div>
          <div className="comment-content">
            <div className="comment-body comment-bubble">
              <div className="comment-author-line">
                <strong>{comment.display_name}</strong>
                {comment.author_role === "member" ? <ProfessionalBadges level={comment.seniority_code} badges={comment.verified_badges} compact/> : <span className="post-team-label">فريق AXIS</span>}
                <time dateTime={comment.created_at} title={new Date(comment.created_at).toLocaleString("ar-EG")}>{formatPostTime(comment.created_at)}</time>
              </div>
              <p>{comment.body}</p>
            </div>
            <div className="comment-action-row">
              <button type="button" className={`comment-action ${comment.has_liked ? "liked" : ""}`} onClick={() => void toggleLikeComment(postId, comment)} disabled={busyLikeCommentId === comment.id} aria-pressed={comment.has_liked}>
                <Heart size={13} fill={comment.has_liked ? "currentColor" : "none"}/><span>{comment.has_liked ? "أعجبك" : "إعجاب"}</span>{comment.like_count > 0 ? <b>{comment.like_count.toLocaleString("ar-EG")}</b> : null}
              </button>
              <button type="button" className="comment-action" onClick={() => setReplyTargets(old => ({ ...old, [postId]: comment }))}>
                <CornerDownLeft size={13}/><span>رد</span>
              </button>
              {(comment.author_id === user.id || user.role === "admin") && <button type="button" className="comment-action comment-delete-action" onClick={() => void deleteComment(postId, comment, thread)}><Trash2 size={13}/><span>حذف</span></button>}
            </div>
          </div>
        </div>
        {replies.length > 0 && <div className="comment-replies">{replies.map(reply => renderComment(postId, reply, thread, depth + 1))}</div>}
      </div>
    );
  }

  return (
    <AppShell user={user} events={events} active="/feed">
      <div className="feed-feedback" aria-live="polite"><Toast message={error} error/><Toast message={success}/></div>

      <form id="compose" className={`card compose compose-professional ${composerExpanded ? "compose-is-expanded" : ""}`} onSubmit={createPost}>
        <input ref={imageInputRef} className="hidden" type="file" id="post-image" accept="image/jpeg,image/png,image/webp" onChange={chooseImage}/>
        <div className="compose-compact-bar">
          <div className="avatar compose-compact-avatar" style={{ background: user.avatar_color || "var(--blue)" }} aria-hidden="true">{user.display_name.slice(0, 1)}</div>
          <button type="button" className="compose-compact-trigger" onClick={() => setComposerExpanded(true)} aria-label="فتح كتابة مشاركة جديدة">
            {body.trim() ? body.trim().slice(0, 74) : "إيه اللي حابب تشاركه مع زملائك؟"}
          </button>
          <label className="compose-compact-photo" htmlFor="post-image" aria-label="إضافة صورة للمنشور" title="إضافة صورة"><ImagePlus size={20}/></label>
        </div>

        <div className={`compose-expanded-content ${composerExpanded ? "is-open" : ""}`}>
          <div className="compose-mobile-expanded-heading"><strong>مشاركة جديدة</strong><button type="button" className="compose-collapse-button" onClick={() => setComposerExpanded(false)} aria-label="تصغير مربع المشاركة"><X size={16}/><span>تصغير</span></button></div>
          <div className="compose-heading">
            <div className="user-line compose-user-line">
              <div className="avatar" style={{ background: user.avatar_color || "var(--blue)" }}>{user.display_name.slice(0, 1)}</div>
              <div className="user-meta">
                <div className="user-name compose-display-name">{user.display_name}{user.role === "member" ? <ProfessionalBadges level={user.seniority_code} badges={user.verified_badges} compact/> : <span className="pill navy">فريق AXIS</span>}</div>
                <div className="user-sub">خبرتك ممكن تفيد زميلك — شاركها معانا</div>
              </div>
            </div>
            <span className="compose-private"><BadgeCheck size={15}/> مساحة للمهندسين المعتمدين</span>
          </div>
          <div className="compose-input-row">
            <div className="avatar compose-mobile-avatar" style={{ background: user.avatar_color || "var(--blue)" }} aria-hidden="true">{user.display_name.slice(0, 1)}</div>
            <label className="sr-only" htmlFor="feed-post-body">نص المشاركة</label>
            <textarea id="feed-post-body" className="field compose-textarea" value={body} onFocus={() => setComposerExpanded(true)} onChange={event => setBody(event.target.value)} maxLength={5000} placeholder="إيه اللي حابب تشاركه مع زملائك؟" aria-label="نص المشاركة" />
          </div>

          {image && <div className="compose-attachment">
            {imagePreview ? <img src={imagePreview} alt="معاينة الصورة المرفقة"/> : <ImagePlus size={20}/>} 
            <div className="compose-attachment-meta"><strong>{image.name}</strong><span>{(image.size / 1024 / 1024).toFixed(2)} MB</span></div>
            <button type="button" className="icon-btn" onClick={() => { setImage(null); if (imageInputRef.current) imageInputRef.current.value = ""; }} aria-label="إزالة الصورة"><X size={17}/></button>
          </div>}

          <div className="compose-bottom">
            <div className="compose-attachments-row">
              <label className="compose-attach-btn" htmlFor="post-image"><Camera size={18}/><span>إضافة صورة</span></label>
              <span className="compose-divider" aria-hidden="true"/>
              <label className="sr-only" htmlFor="post-specialty">تخصص المنشور</label>
              <select id="post-specialty" className="compose-specialty" value={specialty} onChange={event => setSpecialty(event.target.value)} aria-label="تخصص المنشور">
                <option value="">{user.specialty ? `تخصصي: ${user.specialty}` : "اختر التخصص"}</option>
                {SPECIALTIES.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="compose-submit-row">
              <span className={`compose-char-count ${body.length > 4700 ? "near-limit" : ""}`}>{body.length.toLocaleString("ar-EG")} / ٥٠٠٠</span>
              <button type="submit" className="btn btn-primary compose-publish" disabled={busy || (!body.trim() && !image)}><Send size={15}/><span>{busy ? "جارٍ النشر…" : "نشر"}</span></button>
            </div>
          </div>
        </div>
      </form>

      <div className="feed-event-strip" aria-label="فعاليات وأخبار هندسية">
        <span className="feed-event-strip-label"><CalendarDays size={13}/> فعاليات وأخبار</span>
        <span className="feed-event-strip-divider" aria-hidden="true"/>
        {events[0]?.event_url
          ? <a href={events[0].event_url} target="_blank" rel="noreferrer">{events[0].title}</a>
          : <span className="feed-event-strip-title">{events[0]?.title || "أي فعالية جديدة تهمّك هتلاقي تفاصيلها هنا."}</span>}
        {events[0]?.starts_at && <time dateTime={events[0].starts_at}>{new Date(events[0].starts_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}</time>}
      </div>

      <section className="feed-stream" aria-label="منشورات المهندسين">
        <div className="feed-stream-header feed-stream-header-filterable">
          <div className="feed-stream-heading">
            <div><h2>آخر المشاركات</h2><p>{q ? `نتائج البحث عن «${q}»` : filter ? `مشاركات زملائك في تخصص ${filter}` : "شوف جديد زملائك وأسئلتهم وتجاربهم"}</p></div>
          </div>
          <label className="feed-specialty-filter" htmlFor="feed-specialty-filter">
            <SlidersHorizontal size={16} aria-hidden="true"/>
            <span className="sr-only">فلترة المشاركات حسب التخصص</span>
            <select id="feed-specialty-filter" value={filter} onChange={event => setFilter(event.target.value)} aria-label="فلترة المشاركات حسب التخصص">
              <option value="">كل التخصصات</option>
              {SPECIALTIES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        {isRefreshing && <div className="feed-refresh-line"><RefreshCw size={14} className="spin-icon"/> بنحدّث المشاركات…</div>}
        {isLoading ? <div className="feed-loading"><PostSkeleton/><PostSkeleton/></div> : posts.length === 0 ? (
          <div className="empty-state feed-empty-state">
            <div className="feed-empty-icon"><Search size={26}/></div>
            <h2>{q || filter ? "ملقيناش مشاركات مناسبة" : "ابدأها بمشاركة منك"}</h2>
            <p>{q || filter ? "جرّب كلمة بحث تانية أو اختار تخصص مختلف." : "لسه مفيش مشاركات هنا. احكيلنا عن موقف من الشغل، أو اسأل سؤال ممكن يفيد زملاءك."}</p>
            {(q || filter) && <button className="btn btn-primary" type="button" onClick={() => { setFilter(""); if (q) window.location.href = "/feed"; }}>عرض كل المشاركات</button>}
          </div>
        ) : posts.map(post => (
          <article className="card post post-professional" id={`post-${post.id}`} key={post.id} tabIndex={-1}>
            <header className="post-header">
              <div className="user-line post-author-line">
                <div className="avatar post-avatar" style={{ background: post.avatar_color || "var(--blue)" }}>{post.display_name.slice(0, 1)}</div>
                <div className="user-meta post-author-meta">
                  <div className="post-author-name-row">
                    <span className="post-author-name">{post.display_name}</span>
                    {post.author_role === "member" ? <CheckCircle2 size={15} className="post-verified-icon" aria-label="عضو موثّق"/> : <span className="post-team-label">فريق AXIS</span>}
                    {post.author_role === "member" && <ProfessionalBadges level={post.seniority_code} badges={post.verified_badges} compact/>}
                  </div>
                  <div className="post-meta-line">
                    {post.job_title && <span>{post.job_title}</span>}
                    {!post.job_title && post.specialty && <span>تخصص {post.specialty}</span>}
                    {(post.job_title || post.specialty) && <span className="meta-dot"/>}
                    <time dateTime={post.created_at} title={new Date(post.created_at).toLocaleString("ar-EG")}>{formatPostTime(post.created_at)}</time>
                  </div>
                </div>
              </div>
              <div className="post-menu-anchor">
                <button type="button" className="icon-btn post-menu-trigger" aria-label="خيارات المنشور" aria-expanded={openMenuPost === post.id} onClick={() => setOpenMenuPost(openMenuPost === post.id ? null : post.id)}><MoreHorizontal size={20}/></button>
                {openMenuPost === post.id && <div className="post-menu" role="menu">
                  {post.author_id === user.id ? <button type="button" role="menuitem" onClick={() => { setOpenMenuPost(null); void deletePost(post); }}><Trash2 size={16}/> حذف المنشور</button> : <button type="button" role="menuitem" onClick={() => { setReportingPostId(post.id); setReportReason(""); setOpenMenuPost(null); }}><Flag size={16}/> الإبلاغ عن المنشور</button>}
                  <button type="button" role="menuitem" onClick={() => setOpenMenuPost(null)}><X size={15}/> إغلاق</button>
                </div>}
              </div>
            </header>

            {post.specialty && <div className="post-topic-row"><span className="post-topic-chip">{post.specialty}</span><span className="post-topic-caption">من الشغل</span></div>}
            {post.body && <p className="post-body post-professional-body">{post.body}</p>}
            {post.shared_post_id && post.shared_display_name && <div className="shared-post-shell">
              <div className="shared-post-attribution"><Share2 size={14}/><span>{post.display_name} شارك المنشور ده</span></div>
              <article className="shared-post-original">
                <header className="shared-post-original-header">
                  <div className="avatar sm" style={{ background: post.shared_avatar_color || "var(--blue)" }}>{post.shared_display_name.slice(0, 1)}</div>
                  <div className="user-meta"><strong>{post.shared_display_name}</strong><span className="small muted">{post.shared_job_title || (post.shared_specialty ? `تخصص ${post.shared_specialty}` : "من مجتمع AXIS")}</span></div>
                  {post.shared_created_at && <time className="tiny muted" dateTime={post.shared_created_at}>{formatPostTime(post.shared_created_at)}</time>}
                </header>
                {post.shared_body && <p className="shared-post-original-body">{post.shared_body}</p>}
                {post.shared_has_image && <a className="shared-post-original-media" href={`/api/posts/${post.shared_post_id}/image`} target="_blank" rel="noreferrer" aria-label="فتح صورة المنشور الأصلي"><img src={`/api/posts/${post.shared_post_id}/image`} alt={`صورة من منشور ${post.shared_display_name}`} loading="lazy"/></a>}
              </article>
            </div>}
            {post.has_image && <a className="post-media-frame" href={`/api/posts/${post.id}/image`} target="_blank" rel="noreferrer" aria-label="فتح الصورة المرفقة بالحجم الكامل"><img className="post-image post-professional-image" src={`/api/posts/${post.id}/image`} alt={`صورة مرفقة بمنشور ${post.display_name}`} loading="lazy"/></a>}

            {(post.like_count > 0 || post.comment_count > 0) && <div className="post-engagement-summary">
              <span className="post-like-summary"><span className="post-like-dot"><ThumbsUp size={11}/></span>{post.like_count.toLocaleString("ar-EG")} إعجاب</span>
              <button type="button" className="post-comment-summary" onClick={() => void toggleComments(post)}>{post.comment_count.toLocaleString("ar-EG")} تعليقات وردود</button>
            </div>}

            <div className="post-action-bar post-action-bar-compact">
              <button type="button" className={`post-action post-action-professional ${post.has_liked ? "liked" : ""}`} onClick={() => void toggleLike(post)} disabled={busyLikePostId === post.id} aria-pressed={post.has_liked}>
                <ThumbsUp size={15}/><span>{post.has_liked ? "أعجبك" : "إعجاب"}</span><b>{post.like_count.toLocaleString("ar-EG")}</b>
              </button>
              <button type="button" className={`post-action post-action-professional ${openComments === post.id ? "selected" : ""}`} onClick={() => void toggleComments(post)} aria-expanded={openComments === post.id}>
                <MessageCircle size={15}/><span>تعليق</span><b>{post.comment_count.toLocaleString("ar-EG")}</b>
              </button>
              <button type="button" className="post-action post-action-professional post-share-action" onClick={() => void sharePost(post)}>
                <Share2 size={15}/><span>مشاركة</span>
              </button>
            </div>

            {reportingPostId === post.id && <div className="post-report-panel">
              <div className="between"><strong>إبلاغ عن المنشور</strong><button type="button" className="icon-btn" aria-label="إغلاق الإبلاغ" onClick={() => setReportingPostId(null)}><X size={16}/></button></div>
              <p>قول لنا إيه اللي محتاج مراجعة، وفريق AXIS هيتابع البلاغ.</p>
              <textarea className="field" rows={3} maxLength={1000} value={reportReason} onChange={event => setReportReason(event.target.value)} placeholder="احكي لنا إيه المشكلة…"/>
              <div className="row"><button type="button" className="btn btn-small" onClick={() => setReportingPostId(null)}>إلغاء</button><button type="button" className="btn btn-danger btn-small" disabled={reportReason.trim().length < 3} onClick={() => void reportPost(post.id)}><Flag size={14}/> إرسال البلاغ</button></div>
            </div>}

            {openComments === post.id && <section className="comments comments-professional" aria-label="تعليقات المنشور">
              <div className="comments-heading"><div><h3>التعليقات</h3><span>{(comments[post.id] || []).length.toLocaleString("ar-EG")} تعليقات وردود</span></div></div>
              {!comments[post.id] ? <div className="comments-loading">بنحمّل التعليقات…</div> : comments[post.id].length === 0 ? <p className="comments-empty">لسه محدش علّق. قول رأيك وافتح باب النقاش.</p> : comments[post.id].filter(comment => !comment.parent_comment_id).map(comment => renderComment(post.id, comment, comments[post.id] ?? []))}
              {replyTargets[post.id] && <div className="comment-replying-to"><span>الرد على <strong>{replyTargets[post.id]!.display_name}</strong></span><button type="button" onClick={() => setReplyTargets(old => ({ ...old, [post.id]: null }))}>إلغاء <X size={13}/></button></div>}
              <form className="comment-compose" onSubmit={event => void addComment(post.id, event)}>
                <div className="avatar sm comment-current-avatar" style={{ background: user.avatar_color || "var(--blue)" }}>{user.display_name.slice(0, 1)}</div>
                <label className="sr-only" htmlFor={`comment-${post.id}`}>{replyTargets[post.id] ? "اكتب ردك" : "اكتب تعليقك"}</label>
                <input id={`comment-${post.id}`} className="field" value={commentDrafts[post.id] || ""} onChange={event => setCommentDrafts(old => ({ ...old, [post.id]: event.target.value }))} maxLength={1200} placeholder={replyTargets[post.id] ? `الرد على ${replyTargets[post.id]!.display_name}…` : "اكتب تعليقك…"}/>
                <button type="submit" className="comment-send" disabled={commentBusy || !(commentDrafts[post.id] || "").trim()} aria-label={replyTargets[post.id] ? "إرسال الرد" : "إرسال التعليق"}><Send size={17}/></button>
              </form>
            </section>}
          </article>
        ))}
      </section>
      <div className="feed-footer-note"><BadgeCheck size={15}/> AXIS مساحة للمهندسين أصحاب العضوية المعتمدة — شارك خبرتك واحترم خبرات غيرك.</div>
      {sharingPost && <div className="feed-share-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !shareBusy) setSharingPost(null); }}>
        <section className="feed-share-dialog" role="dialog" aria-modal="true" aria-labelledby="feed-share-dialog-title">
          <header className="feed-share-dialog-header"><div><h2 id="feed-share-dialog-title">مشاركة داخل AXIS</h2><p>خلّي زملاءك يشوفوا المنشور على حسابك.</p></div><button type="button" className="icon-btn" aria-label="إغلاق نافذة المشاركة" disabled={shareBusy} onClick={() => setSharingPost(null)}><X size={18}/></button></header>
          <div className="feed-share-destination"><span className="feed-share-destination-icon"><UserRound size={19}/></span><div><strong>ملفك الشخصي والرئيسية</strong><p>هيظهر المنشور باسمك مع الاحتفاظ باسم صاحبه الأصلي.</p></div><CheckCircle2 size={18} className="feed-share-destination-check"/></div>
          <label className="feed-share-caption-label" htmlFor="feed-share-caption">تحب تضيف تعليق مع المشاركة؟ <span>(اختياري)</span></label>
          <textarea id="feed-share-caption" className="field feed-share-caption" value={shareCaption} onChange={event => setShareCaption(event.target.value)} maxLength={5000} placeholder="اكتب رأيك أو قول لزملائك إيه اللي لفت نظرك في المنشور…" disabled={shareBusy}/>
          <div className="feed-share-source"><span className="avatar sm" style={{ background: sharingPost.shared_avatar_color || sharingPost.avatar_color || "var(--blue)" }}>{(sharingPost.shared_display_name || sharingPost.display_name).slice(0, 1)}</span><div><strong>{sharingPost.shared_display_name || sharingPost.display_name}</strong><p>{sharingPost.shared_body || sharingPost.body || "منشور من مجتمع AXIS"}</p></div></div>
          <p className="feed-share-groups-note">المشاركة في المجموعات هتكون متاحة لما نضيف المجموعات للمنصة.</p>
          <footer className="feed-share-dialog-actions"><button type="button" className="btn" disabled={shareBusy} onClick={() => setSharingPost(null)}>إلغاء</button><button type="button" className="btn btn-primary" disabled={shareBusy} onClick={() => void confirmInternalShare()}><Share2 size={16}/>{shareBusy ? "جارٍ المشاركة…" : "مشاركة على حسابي"}</button></footer>
        </section>
      </div>}
    </AppShell>
  );
}
