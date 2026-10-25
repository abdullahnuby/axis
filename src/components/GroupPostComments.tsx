"use client";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { CornerDownLeft, Edit3, Flag, Heart, Send, Trash2, X } from "lucide-react";
import { ProfessionalBadges } from "@/components/ProfessionalIdentity";
import { Toast } from "@/components/Toast";
import { UserAvatar } from "@/components/UserAvatar";
import type { FeedComment, SessionUser } from "@/lib/types";

type Props = { user: SessionUser; postId: string; initialCount: number; onCountChange: (count: number) => void };
function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} د`;
  if (minutes < 1440) return `منذ ${Math.floor(minutes / 60)} س`;
  return date.toLocaleDateString("ar-EG-u-nu-latn", { day: "numeric", month: "short" });
}

export function GroupPostComments({ user, postId, initialCount, onCountChange }: Props) {
  const [items, setItems] = useState<FeedComment[]>([]);
  const [commentCount, setCommentCount] = useState(initialCount);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null);
  const [editing, setEditing] = useState<FeedComment | null>(null);
  const [editBody, setEditBody] = useState("");
  const [reporting, setReporting] = useState<FeedComment | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "مش قادرين نحمّل التعليقات.");
      const next = (payload.comments || []) as FeedComment[];
      setItems(next);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "مش قادرين نحمّل التعليقات.");
    } finally { setLoading(false); }
  }, [postId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setCommentCount(initialCount); }, [initialCount]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, parentCommentId: replyTo?.id || null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "التعليق ما اتبعتش.");
      const next = [...items, payload.comment as FeedComment];
      setItems(next); setCommentCount(old => old + 1); onCountChange(commentCount + 1); setDraft(""); setReplyTo(null); setSuccess("اتضاف تعليقك.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "التعليق ما اتبعتش."); }
    finally { setBusy(false); }
  }

  async function toggleLike(comment: FeedComment) {
    if (busyId) return;
    setBusyId(comment.id); setError("");
    try {
      const response = await fetch(`/api/comments/${comment.id}/like`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نسجل الإعجاب.");
      setItems(old => old.map(item => item.id === comment.id ? { ...item, has_liked: Boolean(payload.hasLiked ?? payload.liked), like_count: Number(payload.likeCount) || 0 } : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ما قدرناش نسجل الإعجاب."); }
    finally { setBusyId(null); }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>, comment: FeedComment) {
    event.preventDefault();
    const body = editBody.trim();
    if (!body || busyId) return;
    setBusyId(comment.id); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/comments/${comment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نحفظ التعديل.");
      setItems(old => old.map(item => item.id === comment.id ? { ...item, body: payload.comment.body, edited_at: payload.comment.edited_at } : item));
      setEditing(null); setEditBody(""); setSuccess("اتحفظ تعديل التعليق.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ما قدرناش نحفظ التعديل."); }
    finally { setBusyId(null); }
  }

  async function deleteComment(comment: FeedComment) {
    if (busyId || !window.confirm("تحذف التعليق وكل الردود اللي تحته؟")) return;
    setBusyId(comment.id); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نحذف التعليق.");
      const removed = new Set<string>([comment.id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const item of items) if (item.parent_comment_id && removed.has(item.parent_comment_id) && !removed.has(item.id)) { removed.add(item.id); changed = true; }
      }
      const next = items.filter(item => !removed.has(item.id));
      const countRemoved = Math.max(1, Number(payload.removedCount) || removed.size);
      const nextCount = Math.max(0, commentCount - countRemoved);
      setItems(next); setCommentCount(nextCount); onCountChange(nextCount);
      if (editing?.id && removed.has(editing.id)) setEditing(null);
      setSuccess("اتحذف التعليق.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ما قدرناش نحذف التعليق."); }
    finally { setBusyId(null); }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reporting || busyId) return;
    if (reportReason.trim().length < 3) { setError("اكتب سبب واضح للإبلاغ."); return; }
    setBusyId(reporting.id); setError("");
    try {
      const response = await fetch(`/api/comments/${reporting.id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: reportReason.trim() }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "البلاغ ما اتبعتش.");
      setReporting(null); setReportReason(""); setSuccess("وصل بلاغك لفريق AXIS.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "البلاغ ما اتبعتش."); }
    finally { setBusyId(null); }
  }

  function renderComment(comment: FeedComment, depth = 0): ReactNode {
    const replies = items.filter(item => item.parent_comment_id === comment.id);
    const canManage = comment.author_id === user.id || ["admin", "moderator"].includes(user.role);
    const isEditing = editing?.id === comment.id;
    return <div className={`comment-thread ${depth > 0 ? "comment-thread-reply" : ""}`} id={`comment-${comment.id}`} key={comment.id}>
      <div className="comment comment-professional"><UserAvatar userId={comment.author_id} displayName={comment.display_name} avatarColor={comment.avatar_color} hasAvatar={comment.has_avatar} className="sm comment-avatar"/><div className="comment-content">
        <div className="comment-body comment-bubble">{isEditing ? <form className="comment-edit-form" onSubmit={event => void saveEdit(event, comment)}><label className="sr-only" htmlFor={`group-edit-comment-${comment.id}`}>تعديل التعليق</label><textarea id={`group-edit-comment-${comment.id}`} className="field" rows={3} maxLength={1200} value={editBody} onChange={event => setEditBody(event.target.value)}/><div className="comment-edit-actions"><button className="btn btn-primary btn-small" type="submit" disabled={busyId===comment.id||!editBody.trim()}>حفظ</button><button className="btn btn-small" type="button" disabled={busyId===comment.id} onClick={()=>{setEditing(null);setEditBody("");}}>إلغاء</button></div></form> : <><div className="comment-author-line"><Link href={`/people/${encodeURIComponent(comment.username)}`}><strong>{comment.display_name}</strong></Link>{comment.author_role==="member"?<ProfessionalBadges level={comment.seniority_code} badges={comment.verified_badges} compact/>:<span className="post-team-label">فريق AXIS</span>}<time dateTime={comment.created_at}>{timeLabel(comment.created_at)}</time></div><p>{comment.body}</p>{comment.edited_at&&<span className="comment-edited-label">تم التعديل</span>}</>}</div>
        {!isEditing&&<div className="comment-action-row"><button type="button" className={`comment-action ${comment.has_liked?"liked":""}`} onClick={()=>void toggleLike(comment)} disabled={busyId===comment.id} aria-pressed={comment.has_liked}><Heart size={13} fill={comment.has_liked?"currentColor":"none"}/><span>{comment.has_liked?"أعجبك":"إعجاب"}</span>{comment.like_count>0&&<b>{comment.like_count.toLocaleString("ar-EG-u-nu-latn")}</b>}</button><button type="button" className="comment-action" onClick={()=>setReplyTo(comment)}><CornerDownLeft size={13}/><span>رد</span></button>{canManage&&<button type="button" className="comment-action" onClick={()=>{setEditing(comment);setEditBody(comment.body);}}><Edit3 size={13}/><span>تعديل</span></button>}{canManage&&<button type="button" className="comment-action comment-delete-action" onClick={()=>void deleteComment(comment)} disabled={busyId===comment.id}><Trash2 size={13}/><span>حذف</span></button>}{!canManage&&<button type="button" className="comment-action" onClick={()=>{setReporting(comment);setReportReason("");}}><Flag size={13}/><span>إبلاغ</span></button>}</div>}
        {reporting?.id===comment.id&&<form className="post-report-panel comment-report-panel" onSubmit={submitReport}><label className="label" htmlFor={`group-report-comment-${comment.id}`}>سبب الإبلاغ</label><textarea id={`group-report-comment-${comment.id}`} className="field" rows={2} maxLength={1000} value={reportReason} onChange={event=>setReportReason(event.target.value)}/><div className="row"><button type="button" className="btn btn-small" onClick={()=>setReporting(null)}>إلغاء</button><button type="submit" className="btn btn-danger btn-small" disabled={busyId===comment.id||reportReason.trim().length<3}><Flag size={13}/> إرسال البلاغ</button></div></form>}
      </div></div>
      {replies.length>0&&<div className="comment-replies">{replies.map(reply=>renderComment(reply,depth+1))}</div>}
    </div>;
  }

  return <section className="comments comments-professional group-post-comments" aria-label="تعليقات المجموعة"><div className="comments-heading"><div><h3>التعليقات</h3><span>{commentCount.toLocaleString("ar-EG-u-nu-latn")} تعليق ورد</span></div></div><Toast message={error} error/><Toast message={success}/>{loading?<div className="comments-loading">بنحمّل التعليقات…</div>:!items.length?<p className="comments-empty">لسه محدش علّق. ابدأ النقاش.</p>:items.filter(item=>!item.parent_comment_id).map(item=>renderComment(item))}{replyTo&&<div className="comment-replying-to"><span>الرد على <strong>{replyTo.display_name}</strong></span><button type="button" onClick={()=>setReplyTo(null)}>إلغاء <X size={13}/></button></div>}<form className="comment-compose" onSubmit={submitComment}><UserAvatar userId={user.id} displayName={user.display_name} avatarColor={user.avatar_color} hasAvatar={user.has_avatar} version={user.updated_at} className="sm comment-current-avatar"/><label className="sr-only" htmlFor={`group-comment-${postId}`}>{replyTo?"اكتب ردك":"اكتب تعليقك"}</label><input id={`group-comment-${postId}`} className="field" value={draft} onChange={event=>setDraft(event.target.value)} maxLength={1200} placeholder={replyTo?`رد على ${replyTo.display_name}…`:"اكتب تعليقك…"}/><button type="submit" className="comment-send" disabled={busy||!draft.trim()} aria-label={replyTo?"إرسال الرد":"إرسال التعليق"}><Send size={17}/></button></form></section>;
}
