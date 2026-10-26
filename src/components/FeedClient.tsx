"use client";

import { localizedConfirm } from "@/lib/i18n";
import { LocalizedContent } from "@/components/LanguageProvider";
import { useCallback, useEffect, useRef, useState, Fragment, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  Flag,
  ImagePlus,
  Heart,
  Edit3,
  CornerDownLeft,
  Share2,
  MessageCircle,
  MoreHorizontal,
  Pin,
  LockKeyhole,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  ThumbsUp,
  Trash2,
  X,
  UserRound,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AxisLogoMark } from "@/components/AxisLogoMark";
import { UserAvatar } from "@/components/UserAvatar";
import { ProfessionalBadges } from "@/components/ProfessionalIdentity";
import { Toast } from "@/components/Toast";
import { SPECIALTIES } from "@/lib/constants";
import type { FeedComment, FeedPost, SessionUser } from "@/lib/types";

function formatPostTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const elapsed = Math.max(0, Date.now() - date.getTime());
  if (elapsed < 60_000) return "الآن";
  if (elapsed < 3_600_000) return `منذ ${Math.floor(elapsed / 60_000)} د`;
  if (elapsed < 86_400_000) return `منذ ${Math.floor(elapsed / 3_600_000)} س`;
  if (elapsed < 7 * 86_400_000) return `منذ ${Math.floor(elapsed / 86_400_000)} يوم`;
  return date.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: elapsed > 365 * 86_400_000 ? "numeric" : undefined,
    numberingSystem: "latn",
  });
}

const POST_PREVIEW_WORD_LIMIT = 20;

function getPostPreview(text: string): { preview: string; expandable: boolean } {
  const words = text.match(/\S+/g) ?? [];
  if (words.length <= POST_PREVIEW_WORD_LIMIT) return { preview: text, expandable: false };
  const starts: number[] = [];
  const wordRegex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(text)) !== null && starts.length <= POST_PREVIEW_WORD_LIMIT) {
    starts.push(match.index);
  }
  const cutAt = starts[POST_PREVIEW_WORD_LIMIT] ?? text.length;
  return { preview: text.slice(0, cutAt).trimEnd(), expandable: true };
}

function renderPostBodyText(text: string): ReactNode {
  // Keep stored content intact while presenting common lightweight emphasis cleanly.
  // Collapse repeated blank lines so announcements remain readable on mobile screens.
  const normalized = text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  return normalized.split("\n").map((line, lineIndex) => {
    const tokens = line.split(/(\*\*[^*\n]+?\*\*|__[^_\n]+?__)/g);
    return (
      <Fragment key={"line-" + lineIndex}>
        {lineIndex > 0 ? <br /> : null}
        {tokens.map((token, tokenIndex) => {
          if (/^\*\*.+\*\*$/.test(token)) {
            return <strong key={"bold-" + tokenIndex}>{token.slice(2, -2).trim()}</strong>;
          }
          if (/^__.+__$/.test(token)) {
            return <strong key={"underscore-" + tokenIndex}>{token.slice(2, -2).trim()}</strong>;
          }
          return token;
        })}
      </Fragment>
    );
  });
}

function PostSkeleton() {
  return <LocalizedContent>{(
    <article className="card post-skeleton" aria-label="جارٍ تحميل المنشورات">
      <div className="skeleton-author"><span className="skeleton-block skeleton-avatar"/><span className="skeleton-author-lines"><i className="skeleton-block"/><i className="skeleton-block"/></span></div>
      <i className="skeleton-block skeleton-line"/><i className="skeleton-block skeleton-line short"/>
      <div className="skeleton-actions"><i className="skeleton-block"/><i className="skeleton-block"/></div>
    </article>
)}</LocalizedContent>;
}

export function FeedClient({ user }: { user: SessionUser }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const didLoadRef = useRef(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [lockedPostCount, setLockedPostCount] = useState(0);
  const [body, setBody] = useState("");
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [accessLevel, setAccessLevel] = useState<"verified" | "members">("verified");
  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentsFailed, setCommentsFailed] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState(false);
  const [busyLikePostId, setBusyLikePostId] = useState<string | null>(null);
  const [busyLikeCommentId, setBusyLikeCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState("");
  const [busyEditCommentId, setBusyEditCommentId] = useState<string | null>(null);
  const [busyDeleteCommentId, setBusyDeleteCommentId] = useState<string | null>(null);
  const [busyDeletePostId, setBusyDeletePostId] = useState<string | null>(null);
  const [pinBusyPostId, setPinBusyPostId] = useState<string | null>(null);
  const [mainFeedPinBusyId, setMainFeedPinBusyId] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [replyTargets, setReplyTargets] = useState<Record<string, FeedComment | null>>({});
  const [openMenuPost, setOpenMenuPost] = useState<string | null>(null);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [commentReportReason, setCommentReportReason] = useState("");
  const [busyReportCommentId, setBusyReportCommentId] = useState<string | null>(null);
  const [sharingPost, setSharingPost] = useState<FeedPost | null>(null);
  const [shareCaption, setShareCaption] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [followingOnly, setFollowingOnly] = useState(searchParams.get("following") === "1");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const q = searchParams.get("q") || "";
  const sharedPostId = searchParams.get("post") || "";
  const [filter, setFilter] = useState(searchParams.get("specialty") || "");
  const canViewVerifiedContent = user.verification_status === "verified" || ["admin", "reviewer", "moderator"].includes(user.role);

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
    if (followingOnly) params.set("following", "1");
    try {
      const feedResponse = await fetch(`/api/feed?${params.toString()}`, { cache: "no-store" });
      if (feedResponse.status === 401) { window.location.href = "/login"; return; }
      if (feedResponse.status === 403) { window.location.href = "/verification"; return; }
      const feedData = await feedResponse.json();
      if (!feedResponse.ok) throw new Error(feedData.error || "مش قادرين نحمّل المشاركات دلوقتي. جرّب تحدّث الصفحة.");
      setPosts(Array.isArray(feedData.posts) ? feedData.posts : []);
      setLockedPostCount(Math.min(3, Math.max(0, Number(feedData.lockedPostCount) || 0)));
      setNextCursor(typeof feedData.nextCursor === "string" ? feedData.nextCursor : null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "الاتصال فصل لحظة. جرّب تاني، ومشاركاتك هتفضل زي ما هي.");
    } finally {
      didLoadRef.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [q, filter, sharedPostId, followingOnly]);

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({ before: nextCursor });
      if (q) params.set("q", q);
      if (filter) params.set("specialty", filter);
      if (sharedPostId) params.set("post", sharedPostId);
      if (followingOnly) params.set("following", "1");
      const response = await fetch(`/api/feed?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "مش قادرين نحمّل مشاركات أكتر.");
      setPosts(old => [...old, ...(Array.isArray(payload.posts) ? payload.posts.filter((item: FeedPost) => !old.some(existing => existing.id === item.id)) : [])]);
      setNextCursor(typeof payload.nextCursor === "string" ? payload.nextCursor : null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "مش قادرين نحمّل مشاركات أكتر."); }
    finally { setIsLoadingMore(false); }
  }

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const openComposer = () => {
      setComposerExpanded(true);
      window.requestAnimationFrame(() => {
        document.getElementById("compose")?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("feed-post-body")?.focus({ preventScroll: true });
      });
    };
    window.addEventListener("axis-open-composer", openComposer);
    return () => window.removeEventListener("axis-open-composer", openComposer);
  }, []);

  useEffect(() => {
    if (searchParams.get("compose") !== "1") return;
    setComposerExpanded(true);
    window.requestAnimationFrame(() => {
      document.getElementById("compose")?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("feed-post-body")?.focus({ preventScroll: true });
    });
    const params = new URLSearchParams(searchParams.toString());
    params.delete("compose");
    router.replace(params.size ? `/feed?${params.toString()}` : "/feed", { scroll: false });
  }, [searchParams, router]);

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
    data.set("accessLevel", accessLevel);
    if (image) data.set("image", image);
    try {
      const response = await fetch("/api/feed", { method: "POST", body: data });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش ننشر المشاركة. جرّب تاني.");
      setBody(""); setImage(null); setSpecialty(""); setAccessLevel("verified"); setComposerExpanded(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      setSuccess("البوست نزل 🙌");
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

  async function loadComments(postId: string) {
    setCommentsFailed(old => ({ ...old, [postId]: false }));
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "التعليقات مش ظاهرة دلوقتي. جرّب تفتحها تاني.");
      setComments(old => ({ ...old, [postId]: Array.isArray(payload.comments) ? payload.comments : [] }));
    } catch (caught) {
      setCommentsFailed(old => ({ ...old, [postId]: true }));
      setError(caught instanceof Error ? caught.message : "التعليقات مش ظاهرة دلوقتي. جرّب تفتحها تاني.");
    }
  }

  async function toggleComments(post: FeedPost) {
    setError("");
    if (openComments === post.id) { setOpenComments(null); return; }
    setOpenComments(post.id);
    if (comments[post.id]) return;
    await loadComments(post.id);
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

  function beginCommentEdit(comment: FeedComment) {
    setEditingCommentId(comment.id);
    setEditCommentBody(comment.body);
    setError("");
  }

  async function saveCommentEdit(postId: string, comment: FeedComment, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = editCommentBody.trim();
    if (!body || body.length > 1200 || busyEditCommentId) return;
    setBusyEditCommentId(comment.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نحفظ تعديل التعليق. جرّب تاني.");
      setComments(old => ({
        ...old,
        [postId]: (old[postId] || []).map(item => item.id === comment.id
          ? { ...item, body: payload.comment.body, edited_at: payload.comment.edited_at }
          : item),
      }));
      setEditingCommentId(null);
      setEditCommentBody("");
      setSuccess("اتحفظ تعديل التعليق.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ما قدرناش نحفظ تعديل التعليق. جرّب تاني.");
    } finally {
      setBusyEditCommentId(null);
    }
  }

  async function deleteComment(postId: string, comment: FeedComment, thread: FeedComment[]) {
    if (comment.author_id !== user.id && !["admin", "moderator"].includes(user.role)) return;
    if (busyDeleteCommentId || !localizedConfirm("تحب تحذف التعليق ده وكل الردود اللي تحته؟")) return;
    setBusyDeleteCommentId(comment.id);
    setError("");
    setSuccess("");
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
      const removedCount = Math.max(1, Number(payload.removedCount) || removedIds.size);
      setComments(old => ({ ...old, [postId]: (old[postId] || []).filter(item => !removedIds.has(item.id)) }));
      setPosts(old => old.map(post => post.id === postId ? { ...post, comment_count: Math.max(0, post.comment_count - removedCount) } : post));
      if (editingCommentId && removedIds.has(editingCommentId)) { setEditingCommentId(null); setEditCommentBody(""); }
      setSuccess(removedCount > 1 ? `اتحذف التعليق و${(removedCount - 1).toLocaleString("ar-EG", { numberingSystem: "latn" })} من الردود التابعة له.` : "اتحذف التعليق.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ما قدرناش نحذف التعليق دلوقتي. جرّب تاني.");
    } finally {
      setBusyDeleteCommentId(null);
    }
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

  async function reportComment(comment: FeedComment) {
    const reason = commentReportReason.trim();
    if (reason.length < 3) { setError("احكيلنا إيه المشكلة في التعليق."); return; }
    setBusyReportCommentId(comment.id); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/comments/${comment.id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "البلاغ ما اتبعتش. جرّب تاني.");
      setReportingCommentId(null); setCommentReportReason(""); setSuccess("وصل بلاغك لفريق AXIS، وهيتراجع.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "البلاغ ما اتبعتش. جرّب تاني.");
    } finally { setBusyReportCommentId(null); }
  }

  function beginPostEdit(post: FeedPost) {
    setEditingPost(post); setEditBody(post.body || ""); setEditSpecialty(post.specialty || ""); setOpenMenuPost(null); setError("");
  }

  async function savePostEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editingPost || editBusy) return;
    setEditBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/posts/${editingPost.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: editBody, specialty: editSpecialty }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نحفظ التعديل.");
      setPosts(old => old.map(post => post.id === editingPost.id ? { ...post, body: payload.post.body, specialty: payload.post.specialty } : post));
      setEditingPost(null);
      setSuccess("التعديل اتحفظ.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ما قدرناش نحفظ التعديل."); }
    finally { setEditBusy(false); }
  }

  async function deletePost(post: FeedPost) {
    if ((post.author_id !== user.id && !["admin", "moderator"].includes(user.role)) || busyDeletePostId || !localizedConfirm("متأكد إنك عايز تحذف البوست نهائيًا؟")) return;
    setBusyDeletePostId(post.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نحذف البوست دلوقتي. جرّب تاني.");
      setPosts(old => old.filter(item => item.id !== post.id));
      setOpenMenuPost(null);
      setSuccess("البوست اتحذف.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ما قدرناش نحذف البوست دلوقتي. جرّب تاني.");
    } finally {
      setBusyDeletePostId(null);
    }
  }

  async function togglePinPost(post: FeedPost) {
    if (post.group_id || pinBusyPostId) return;
    const nextPinned = !post.pinned_at;
    setPinBusyPostId(post.id);
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
        if (payload.pinned && item.author_id === user.id && !item.group_id) return { ...item, pinned_at: null };
        return item;
      }));
      setSuccess(payload.pinned ? "ثبتنا البوست على ملفك الشخصي." : "اتشال تثبيت البوست من ملفك.");
      setOpenMenuPost(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ما قدرناش نثبت البوست. جرّب تاني.");
    } finally {
      setPinBusyPostId(null);
    }
  }

  function renderExpandableBody(text: string, key: string, className: string): ReactNode {
    const preview = getPostPreview(text);
    const expanded = Boolean(expandedPosts[key]);
    return <LocalizedContent>{(
      <div className="post-expandable-text">
        <p className={`${className} no-translate`}>{renderPostBodyText(preview.expandable && !expanded ? `${preview.preview}…` : text)}</p>
        {preview.expandable && (
          <button
            type="button"
            className="post-read-more-button"
            aria-expanded={expanded}
            onClick={() => setExpandedPosts(old => ({ ...old, [key]: !old[key] }))}
          >
            {expanded ? "عرض أقل" : "عرض المزيد"}
          </button>
        )}
      </div>
)}</LocalizedContent>;
  }

  async function toggleMainFeedPin(post: FeedPost) {
    if (user.role !== "admin" || post.group_id || mainFeedPinBusyId) return;
    const nextPinned = !post.main_feed_pinned_at;
    setMainFeedPinBusyId(post.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/posts/${post.id}/main-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: nextPinned }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ما قدرناش نثبت البوست في الرئيسية. جرّب تاني.");
      setPosts(old => old.map(item => ({
        ...item,
        main_feed_pinned_at: item.id === post.id ? (payload.main_feed_pinned_at || null) : (payload.pinned ? null : item.main_feed_pinned_at),
        main_feed_pinned_by: item.id === post.id ? (payload.pinned ? user.id : null) : (payload.pinned ? null : item.main_feed_pinned_by),
      })));
      setSuccess(payload.pinned ? "البوست اتثبت في الرئيسية، وأي تثبيت سابق اتشال." : "اتشال تثبيت البوست من الرئيسية.");
      setOpenMenuPost(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ما قدرناش نثبت البوست في الرئيسية.");
    } finally {
      setMainFeedPinBusyId(null);
    }
  }

  function renderComment(postId: string, comment: FeedComment, thread: FeedComment[], depth = 0): ReactNode {
    const replies = thread.filter(item => item.parent_comment_id === comment.id);
    const canManageComment = comment.author_id === user.id || ["admin", "moderator"].includes(user.role);
    const isEditing = editingCommentId === comment.id;
    return <LocalizedContent>{(
      <div className={`comment-thread ${depth > 0 ? "comment-thread-reply" : ""}`} id={`comment-${comment.id}`} key={comment.id}>
        <div className="comment comment-professional">
          <UserAvatar userId={comment.author_id} displayName={comment.display_name} avatarColor={comment.avatar_color} hasAvatar={comment.has_avatar} className="sm comment-avatar"/>
          <div className="comment-content">
            <div className="comment-body comment-bubble">
              {isEditing ? (
                <form className="comment-edit-form" onSubmit={event => void saveCommentEdit(postId, comment, event)}>
                  <label className="sr-only" htmlFor={`edit-comment-${comment.id}`}>تعديل التعليق</label>
                  <textarea id={`edit-comment-${comment.id}`} className="field" rows={3} maxLength={1200} value={editCommentBody} onChange={event => setEditCommentBody(event.target.value)} autoFocus />
                  <div className="comment-edit-actions">
                    <button type="submit" className="btn btn-primary btn-small" disabled={busyEditCommentId === comment.id || !editCommentBody.trim()}>{busyEditCommentId === comment.id ? "جارٍ الحفظ…" : "حفظ"}</button>
                    <button type="button" className="btn btn-small" disabled={busyEditCommentId === comment.id} onClick={() => { setEditingCommentId(null); setEditCommentBody(""); }}>إلغاء</button>
                  </div>
                </form>
              ) : <>
                <div className="comment-author-line">
                  <Link href={`/people/${encodeURIComponent(comment.username)}`}><strong className="no-translate">{comment.display_name}</strong></Link>
                  {comment.author_role === "member" ? <ProfessionalBadges level={comment.seniority_code} badges={comment.verified_badges} compact/> : <span className="post-team-label">فريق AXIS</span>}
                  <time dateTime={comment.created_at} title={new Date(comment.created_at).toLocaleString("ar-EG", { numberingSystem: "latn" })}>{formatPostTime(comment.created_at)}</time>
                </div>
                <p className="no-translate">{comment.body}</p>
                {comment.edited_at ? <span className="comment-edited-label">تم التعديل</span> : null}
              </>}
            </div>
            {!isEditing && <div className="comment-action-row">
              <button type="button" className={`comment-action ${comment.has_liked ? "liked" : ""}`} onClick={() => void toggleLikeComment(postId, comment)} disabled={busyLikeCommentId === comment.id} aria-pressed={comment.has_liked}>
                <Heart size={13} fill={comment.has_liked ? "currentColor" : "none"}/><span>{comment.has_liked ? "أعجبك" : "إعجاب"}</span>{comment.like_count > 0 ? <b>{comment.like_count.toLocaleString("ar-EG", { numberingSystem: "latn" })}</b> : null}
              </button>
              <button type="button" className="comment-action" onClick={() => setReplyTargets(old => ({ ...old, [postId]: comment }))}>
                <CornerDownLeft size={13}/><span>رد</span>
              </button>
              {canManageComment && <button type="button" className="comment-action" onClick={() => beginCommentEdit(comment)}><Edit3 size={13}/><span>تعديل</span></button>}
              {canManageComment && <button type="button" className="comment-action comment-delete-action" onClick={() => void deleteComment(postId, comment, thread)} disabled={busyDeleteCommentId === comment.id}><Trash2 size={13}/><span>{busyDeleteCommentId === comment.id ? "جارٍ الحذف…" : "حذف"}</span></button>}
              {!canManageComment && <button type="button" className="comment-action" onClick={() => { setReportingCommentId(comment.id); setCommentReportReason(""); setError(""); }}><Flag size={13}/><span>إبلاغ</span></button>}
            </div>}
            {reportingCommentId === comment.id && <form className="post-report-panel comment-report-panel" onSubmit={event => { event.preventDefault(); void reportComment(comment); }}>
              <label className="label" htmlFor={`report-comment-${comment.id}`}>إيه المشكلة في التعليق ده؟</label>
              <textarea id={`report-comment-${comment.id}`} className="field" rows={2} maxLength={1000} value={commentReportReason} onChange={event => setCommentReportReason(event.target.value)} placeholder="وضح السبب باختصار…" />
              <div className="row"><button type="button" className="btn btn-small" onClick={() => { setReportingCommentId(null); setCommentReportReason(""); }} disabled={busyReportCommentId === comment.id}>إلغاء</button><button type="submit" className="btn btn-danger btn-small" disabled={busyReportCommentId === comment.id || commentReportReason.trim().length < 3}><Flag size={13}/>{busyReportCommentId === comment.id ? "جارٍ الإرسال…" : "إرسال البلاغ"}</button></div>
            </form>}
          </div>
        </div>
        {replies.length > 0 && <div className="comment-replies">{replies.map(reply => renderComment(postId, reply, thread, depth + 1))}</div>}
      </div>
)}</LocalizedContent>;
  }

  return <LocalizedContent>{(
    <>
      <div className="feed-feedback" aria-live="polite"><Toast message={error} error/><Toast message={success}/></div>

      {!canViewVerifiedContent && <section className="card feed-access-banner">
        <div className="feed-access-banner-copy">
          <span className="feed-access-banner-icon"><LockKeyhole size={21}/></span>
          <div><strong>أهلًا بيك في معاينة AXIS</strong><p>هتشوف منشورات مختارة اختار أصحابها إتاحتها لكل الأعضاء المسجلين. النقاشات المهنية والرسائل والتفاعل بتفتح بعد توثيق عضويتك.</p></div>
        </div>
        <Link href="/verification" className="btn btn-primary btn-small">وثّق عضويتك</Link>
      </section>}

      {canViewVerifiedContent && <form id="compose" className={`card compose compose-professional ${composerExpanded ? "compose-is-expanded" : ""}`} onSubmit={createPost}>
        <input ref={imageInputRef} className="hidden" type="file" id="post-image" accept="image/jpeg,image/png,image/webp" onChange={chooseImage}/>
        <div className="compose-compact-bar">
          <UserAvatar userId={user.id} displayName={user.display_name} avatarColor={user.avatar_color} hasAvatar={user.has_avatar} version={user.updated_at} className="compose-compact-avatar"/>
          <button type="button" className="compose-compact-trigger" onClick={() => setComposerExpanded(true)} aria-label="فتح كتابة بوست جديد">
            {body.trim() ? body.trim().slice(0, 74) : "إيه اللي على بالك؟ احكي موقف، اسأل سؤال، أو افتح موضوع للنقاش…"}
          </button>
          <label className="compose-compact-photo" htmlFor="post-image" aria-label="إضافة صورة للمنشور" title="إضافة صورة"><ImagePlus size={20}/></label>
        </div>

        <div className={`compose-expanded-content ${composerExpanded ? "is-open" : ""}`}>
          <div className="compose-mobile-expanded-heading"><strong>بوست جديد</strong><button type="button" className="compose-collapse-button" onClick={() => setComposerExpanded(false)} aria-label="تصغير مربع المشاركة"><X size={16}/><span>تصغير</span></button></div>
          <div className="compose-heading">
            <div className="user-line compose-user-line">
              <UserAvatar userId={user.id} displayName={user.display_name} avatarColor={user.avatar_color} hasAvatar={user.has_avatar} version={user.updated_at}/>
              <div className="user-meta">
                <div className="user-name compose-display-name">{user.display_name}{user.role === "member" ? <ProfessionalBadges level={user.seniority_code} badges={user.verified_badges} compact/> : <span className="pill navy">فريق AXIS</span>}</div>
                <div className="user-sub">قول اللي عندك — سؤال أو موقف أو موضوع على بالك</div>
              </div>
            </div>
            <span className="compose-private"><BadgeCheck size={15}/> مجتمع للأعضاء المقبولين · البوست بيظهر باسم حسابك</span>
          </div>
          <div className="compose-input-row">
            <UserAvatar userId={user.id} displayName={user.display_name} avatarColor={user.avatar_color} hasAvatar={user.has_avatar} version={user.updated_at} className="compose-mobile-avatar"/>
            <label className="sr-only" htmlFor="feed-post-body">نص المشاركة</label>
            <textarea id="feed-post-body" className="field compose-textarea" value={body} onFocus={() => setComposerExpanded(true)} onChange={event => setBody(event.target.value)} maxLength={5000} placeholder="إيه اللي على بالك؟ احكي موقف، اسأل سؤال، أو افتح موضوع للنقاش…" aria-label="نص البوست" />
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
              <label className="sr-only" htmlFor="post-access-level">مين يقدر يشوف المنشور؟</label>
              <select id="post-access-level" className="compose-specialty compose-audience-select" value={accessLevel} onChange={event => setAccessLevel(event.target.value === "members" ? "members" : "verified")} aria-label="مين يقدر يشوف المنشور؟">
                <option value="verified">للمهندسين الموثقين</option>
                <option value="members">لكل الأعضاء المسجلين</option>
              </select>
            </div>
            <div className="compose-submit-row">
              <span className={`compose-char-count ${body.length > 4700 ? "near-limit" : ""}`}>{body.length.toLocaleString("en-US")} / 5000</span>
              <button type="submit" className="btn btn-primary compose-publish" disabled={busy || (!body.trim() && !image)}><Send size={15}/><span>{busy ? "جارٍ النشر…" : "نشر"}</span></button>
            </div>
          </div>
        </div>
      </form>}


      <section className="feed-stream" aria-label="بوستات المجتمع">
        <div className="feed-stream-header feed-stream-header-filterable">
          <div className="feed-stream-heading">
            <div><h2>آخر البوستات</h2><p>{q ? `نتائج البحث عن «${q}»` : followingOnly ? "بوستات الناس اللي بتتابعها" : filter ? `بوستات من مجال ${filter}` : "شوف الناس بتتكلم في إيه"}</p>{canViewVerifiedContent ? <div className="feed-scope-switch"><button type="button" className={!followingOnly?"active":""} onClick={()=>setFollowingOnly(false)}>الكل</button><button type="button" className={followingOnly?"active":""} onClick={()=>setFollowingOnly(true)}>بتابعهم</button></div> : <span className="feed-limited-mode">معاينة محدودة</span>}</div>
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
        {isLoading ? <div className="feed-loading"><PostSkeleton/><PostSkeleton/></div> : posts.length === 0 && lockedPostCount === 0 ? (
          <div className="empty-state feed-empty-state">
            <div className="feed-empty-icon"><Search size={26}/></div>
            <h2>{q || filter ? "ملقيناش مشاركات مناسبة" : canViewVerifiedContent ? "ابدأها بمشاركة منك" : "لسه مفيش منشورات متاحة للمعاينة"}</h2>
            <p>{q || filter ? "جرّب كلمة بحث تانية أو اختار تخصص مختلف." : canViewVerifiedContent ? "لسه مفيش بوستات هنا. ابدأ الكلام بسؤال، موقف حصل معاك، أو موضوع نفسك تسمع رأي الناس فيه." : "أول ما تنزل منشورات مختارة للأعضاء المسجلين هتظهر هنا. تقدر توثّق عضويتك لفتح كل النقاشات المهنية."}</p>
            {(q || filter) && <button className="btn btn-primary" type="button" onClick={() => { setFilter(""); if (q) window.location.href = "/feed"; }}>عرض كل البوستات</button>}
          </div>
        ) : posts.map(post => !canViewVerifiedContent ? (
          <article className="card post post-professional post-member-preview" id={`post-${post.id}`} key={post.id} tabIndex={-1}>
            <header className="post-header post-preview-header">
              <div className="user-line post-author-line">
                <UserAvatar userId={post.author_id} displayName={post.display_name} avatarColor={post.avatar_color} hasAvatar={post.has_avatar} className="post-avatar"/>
                <div className="user-meta post-author-meta">
                  <strong className="post-author-name no-translate">{post.display_name}</strong>
                  <div className="post-meta-line">
                    {post.specialty && <span>تخصص <b className="no-translate">{post.specialty}</b></span>}
                    {post.job_title && <span>{post.job_title}</span>}
                    {(post.job_title || post.specialty) && <span className="meta-dot"/>}
                    <time dateTime={post.created_at} title={new Date(post.created_at).toLocaleString("ar-EG", { numberingSystem: "latn" })}>{formatPostTime(post.created_at)}</time>
                  </div>
                </div>
              </div>
              <span className="post-preview-access-tag">منشور مختار</span>
            </header>
            {post.body && renderExpandableBody(post.body, post.id, "post-body post-professional-body")}
            {post.has_image && <a className="post-media-frame" href={`/api/posts/${post.id}/image`} target="_blank" rel="noreferrer" aria-label="فتح الصورة المرفقة بالحجم الكامل"><img className="post-image post-professional-image" src={`/api/posts/${post.id}/image`} alt="صورة مرفقة بمنشور مختار" loading="lazy"/></a>}
            <footer className="post-preview-lock-footer">
              <span><LockKeyhole size={15}/> التفاعل متاح بعد توثيق العضوية.</span>
              <Link href="/verification">وثّق عضويتك</Link>
            </footer>
          </article>
        ) : (
          <article className="card post post-professional" id={`post-${post.id}`} key={post.id} tabIndex={-1}>
            <header className="post-header">
              <div className="user-line post-author-line">
                <UserAvatar userId={post.author_id} displayName={post.display_name} avatarColor={post.avatar_color} hasAvatar={post.has_avatar} className="post-avatar"/>
                <div className="user-meta post-author-meta">
                  <div className="post-author-name-row">
                    <Link className="post-author-name no-translate" href={`/people/${encodeURIComponent(post.username)}`}>{post.display_name}</Link>
                    {post.author_role === "member" ? <CheckCircle2 size={15} className="post-verified-icon" aria-label="عضو موثّق"/> : <span className="post-team-label">فريق AXIS</span>}
                    {post.author_role === "member" && <ProfessionalBadges level={post.seniority_code} badges={post.verified_badges} compact/>}
                  </div>
                  <div className="post-meta-line">
                    {post.job_title && <span>{post.job_title}</span>}
                    {!post.job_title && post.specialty && <span>تخصص {post.specialty}</span>}
                    {(post.job_title || post.specialty) && <span className="meta-dot"/>}
                    <time dateTime={post.created_at} title={new Date(post.created_at).toLocaleString("ar-EG", { numberingSystem: "latn" })}>{formatPostTime(post.created_at)}</time>
                  </div>
                </div>
              </div>
              <div className="post-menu-anchor">
                <button type="button" className="icon-btn post-menu-trigger" aria-label="خيارات المنشور" aria-expanded={openMenuPost === post.id} onClick={() => setOpenMenuPost(openMenuPost === post.id ? null : post.id)}><MoreHorizontal size={20}/></button>
                {openMenuPost === post.id && <div className="post-menu" role="menu">
                  {(post.author_id === user.id || ["admin", "moderator"].includes(user.role)) ? <><button type="button" role="menuitem" onClick={() => beginPostEdit(post)}><Edit3 size={16}/> تعديل البوست</button><button type="button" role="menuitem" disabled={busyDeletePostId === post.id} onClick={() => { setOpenMenuPost(null); void deletePost(post); }}><Trash2 size={16}/> {busyDeletePostId === post.id ? "جارٍ الحذف…" : "حذف البوست"}</button>{post.author_id === user.id && !post.group_id && <button type="button" role="menuitem" disabled={pinBusyPostId === post.id} onClick={() => void togglePinPost(post)}><Pin size={16}/> {pinBusyPostId === post.id ? "جارٍ التثبيت…" : post.pinned_at ? "إلغاء التثبيت من ملفي" : "تثبيت في ملفي"}</button>}</> : <button type="button" role="menuitem" onClick={() => { setReportingPostId(post.id); setReportReason(""); setOpenMenuPost(null); }}><Flag size={16}/> الإبلاغ عن البوست</button>}
                  {user.role === "admin" && !post.group_id && <button type="button" role="menuitem" disabled={mainFeedPinBusyId === post.id} onClick={() => void toggleMainFeedPin(post)}><Pin size={16}/>{mainFeedPinBusyId === post.id ? "جارٍ التثبيت…" : post.main_feed_pinned_at ? "إلغاء التثبيت من الرئيسية" : "تثبيت في الرئيسية"}</button>}
                  <button type="button" role="menuitem" onClick={() => setOpenMenuPost(null)}><X size={15}/> إغلاق</button>
                </div>}
              </div>
            </header>

            {post.main_feed_pinned_at && <div className="post-pinned-badge main-feed-pinned"><Pin size={14}/> مثبت في الرئيسية بواسطة الإدارة</div>}
            {post.pinned_at && <div className="post-pinned-badge"><Pin size={14}/> {post.group_id ? "مثبت في الجروب" : "مثبت على الملف الشخصي"}</div>}
            {post.specialty && <div className="post-topic-row"><span className="post-topic-chip">{post.specialty}</span><span className="post-topic-caption">موضوع النقاش</span></div>}
            {editingPost?.id === post.id ? <form className="post-edit-form" onSubmit={savePostEdit}><label className="sr-only" htmlFor={`edit-post-${post.id}`}>تعديل نص المنشور</label><textarea id={`edit-post-${post.id}`} className="field" maxLength={5000} rows={4} value={editBody} onChange={event=>setEditBody(event.target.value)} placeholder="اكتب تحديثك…"/><label className="post-edit-specialty"><span>التخصص</span><select className="field" value={editSpecialty} onChange={event=>setEditSpecialty(event.target.value)}><option value="">بدون تخصص</option>{SPECIALTIES.map(item=><option key={item}>{item}</option>)}</select></label><div className="row"><button className="btn btn-primary btn-small" disabled={editBusy||!editBody.trim()&&!post.has_image&&!post.shared_post_id}>{editBusy?"جارٍ الحفظ…":"حفظ التعديل"}</button><button className="btn btn-small" type="button" disabled={editBusy} onClick={()=>setEditingPost(null)}>إلغاء</button></div></form> : post.body && renderExpandableBody(post.body, post.id, "post-body post-professional-body")}
            {post.shared_post_id && post.shared_display_name && <div className="shared-post-shell">
              <div className="shared-post-attribution"><Share2 size={14}/><span>{post.display_name} شارك المنشور ده</span></div>
              <article className="shared-post-original">
                <header className="shared-post-original-header">
                  <UserAvatar userId={post.shared_author_id} displayName={post.shared_display_name} avatarColor={post.shared_avatar_color} hasAvatar={post.shared_has_avatar} className="sm"/>
                  <div className="user-meta"><Link href={`/people/${encodeURIComponent(post.shared_username || "")}`}><strong className="no-translate">{post.shared_display_name}</strong></Link><span className="small muted">{post.shared_job_title || (post.shared_specialty ? `تخصص ${post.shared_specialty}` : "من مجتمع AXIS")}</span></div>
                  {post.shared_created_at && <time className="tiny muted" dateTime={post.shared_created_at}>{formatPostTime(post.shared_created_at)}</time>}
                </header>
                {post.shared_body && renderExpandableBody(post.shared_body, `shared:${post.id}`, "shared-post-original-body")}
                {post.shared_has_image && <a className="shared-post-original-media" href={`/api/posts/${post.shared_post_id}/image`} target="_blank" rel="noreferrer" aria-label="فتح صورة المنشور الأصلي"><img src={`/api/posts/${post.shared_post_id}/image`} alt={`صورة من منشور ${post.shared_display_name}`} loading="lazy"/></a>}
              </article>
            </div>}
            {post.has_image && <a className="post-media-frame" href={`/api/posts/${post.id}/image`} target="_blank" rel="noreferrer" aria-label="فتح الصورة المرفقة بالحجم الكامل"><img className="post-image post-professional-image" src={`/api/posts/${post.id}/image`} alt={`صورة مرفقة بمنشور ${post.display_name}`} loading="lazy"/></a>}

            {(post.like_count > 0 || post.comment_count > 0) && <div className="post-engagement-summary">
              <span className="post-like-summary"><span className="post-like-dot"><ThumbsUp size={11}/></span>{post.like_count.toLocaleString("ar-EG", { numberingSystem: "latn" })} إعجاب</span>
              <button type="button" className="post-comment-summary" onClick={() => void toggleComments(post)}>{post.comment_count.toLocaleString("ar-EG", { numberingSystem: "latn" })} تعليقات وردود</button>
            </div>}

            <div className="post-action-bar post-action-bar-compact">
              <button type="button" className={`post-action post-action-professional ${post.has_liked ? "liked" : ""}`} onClick={() => void toggleLike(post)} disabled={busyLikePostId === post.id} aria-pressed={post.has_liked}>
                <ThumbsUp size={15}/><span>{post.has_liked ? "أعجبك" : "إعجاب"}</span><b>{post.like_count.toLocaleString("ar-EG", { numberingSystem: "latn" })}</b>
              </button>
              <button type="button" className={`post-action post-action-professional ${openComments === post.id ? "selected" : ""}`} onClick={() => void toggleComments(post)} aria-expanded={openComments === post.id}>
                <MessageCircle size={15}/><span>تعليق</span><b>{post.comment_count.toLocaleString("ar-EG", { numberingSystem: "latn" })}</b>
              </button>
              <button type="button" className="post-action post-action-professional post-share-action" onClick={() => void sharePost(post)}>
                <Share2 size={15}/><span>مشاركة</span>
              </button>
            </div>

            {reportingPostId === post.id && <div className="post-report-panel">
              <div className="between"><strong>إبلاغ عن المنشور</strong><button type="button" className="icon-btn" aria-label="إغلاق الإبلاغ" onClick={() => setReportingPostId(null)}><X size={16}/></button></div>
              <p>قول لنا إيه المشكلة، وفريق AXIS هيراجع البلاغ.</p>
              <textarea className="field" rows={3} maxLength={1000} value={reportReason} onChange={event => setReportReason(event.target.value)} placeholder="احكي لنا إيه المشكلة…"/>
              <div className="row"><button type="button" className="btn btn-small" onClick={() => setReportingPostId(null)}>إلغاء</button><button type="button" className="btn btn-danger btn-small" disabled={reportReason.trim().length < 3} onClick={() => void reportPost(post.id)}><Flag size={14}/> إرسال البلاغ</button></div>
            </div>}

            {openComments === post.id && <section className="comments comments-professional" aria-label="تعليقات المنشور">
              <div className="comments-heading"><div><h3>التعليقات</h3><span>{(comments[post.id] || []).length.toLocaleString("ar-EG", { numberingSystem: "latn" })} تعليقات وردود</span></div></div>
              {!comments[post.id] ? (commentsFailed[post.id] ? <div className="comments-error" role="alert"><span>مقدرناش نحمّل التعليقات.</span><button type="button" onClick={() => void loadComments(post.id)}>حاول تاني</button></div> : <div className="comments-loading">بنحمّل التعليقات…</div>) : comments[post.id].length === 0 ? <p className="comments-empty">لسه محدش علّق. قول رأيك وافتح باب النقاش.</p> : comments[post.id].filter(comment => !comment.parent_comment_id).map(comment => renderComment(post.id, comment, comments[post.id] ?? []))}
              {replyTargets[post.id] && <div className="comment-replying-to"><span>الرد على <strong>{replyTargets[post.id]!.display_name}</strong></span><button type="button" onClick={() => setReplyTargets(old => ({ ...old, [post.id]: null }))}>إلغاء <X size={13}/></button></div>}
              <form className="comment-compose" onSubmit={event => void addComment(post.id, event)}>
                <UserAvatar userId={user.id} displayName={user.display_name} avatarColor={user.avatar_color} hasAvatar={user.has_avatar} version={user.updated_at} className="sm comment-current-avatar"/>
                <label className="sr-only" htmlFor={`comment-${post.id}`}>{replyTargets[post.id] ? "اكتب ردك" : "اكتب تعليقك"}</label>
                <input id={`comment-${post.id}`} className="field" value={commentDrafts[post.id] || ""} onChange={event => setCommentDrafts(old => ({ ...old, [post.id]: event.target.value }))} maxLength={1200} placeholder={replyTargets[post.id] ? `الرد على ${replyTargets[post.id]!.display_name}…` : "اكتب تعليقك…"}/>
                <button type="submit" className="comment-send" disabled={commentBusy || !(commentDrafts[post.id] || "").trim()} aria-label={replyTargets[post.id] ? "إرسال الرد" : "إرسال التعليق"}><Send size={17}/></button>
              </form>
            </section>}
          </article>
        ))}
        {lockedPostCount > 0 && !canViewVerifiedContent && <section className="locked-post-preview-list" aria-label="نقاشات مهنية مقفولة">
          <header className="locked-post-preview-heading"><span><LockKeyhole size={19}/></span><div><h3>نقاشات مهنية مقفولة</h3><p>تظهر بعد التوثيق</p></div></header>
          {Array.from({ length: lockedPostCount }, (_, index) => <article className="locked-post-teaser" key={`locked-post-${index}`}>
            <span className="locked-post-visual"><LockKeyhole size={19}/></span>
            <div className="locked-post-copy"><strong>نقاش مهني مقفول</strong><p>محتوى مخصص للمهندسين الموثقين.</p></div>
            <Link href="/verification" className="btn btn-primary btn-small">وثّق عضويتك</Link>
          </article>)}
        </section>}
        {nextCursor && !isLoading && <div className="feed-load-more-wrap"><button type="button" className="btn feed-load-more" onClick={()=>void loadMore()} disabled={isLoadingMore}>{isLoadingMore?<RefreshCw size={15} className="spin-icon"/>:null}{isLoadingMore?"بنحمّل كمان…":"عرض مشاركات أقدم"}</button></div>}
      </section>
      <div className="feed-footer-note"><BadgeCheck size={15}/> AXIS مساحة خاصة للأعضاء — اتكلم باحترام، وما تشاركش أسرار شغل أو بيانات شخصية. البوستات بتظهر باسم حسابك.</div>
      {sharingPost && <div className="feed-share-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !shareBusy) setSharingPost(null); }}>
        <section className="feed-share-dialog" role="dialog" aria-modal="true" aria-labelledby="feed-share-dialog-title">
          <header className="feed-share-dialog-header"><div><h2 id="feed-share-dialog-title">إعادة نشر داخل AXIS</h2><p>خلّي باقي الأعضاء يشوفوا البوست على حسابك.</p></div><button type="button" className="icon-btn" aria-label="إغلاق نافذة المشاركة" disabled={shareBusy} onClick={() => setSharingPost(null)}><X size={18}/></button></header>
          <div className="feed-share-destination"><span className="feed-share-destination-icon"><UserRound size={19}/></span><div><strong>حسابك والصفحة الرئيسية</strong><p>إعادة النشر بتظهر باسم حسابك، واسم صاحب البوست الأصلي بيفضل موجود.</p></div><CheckCircle2 size={18} className="feed-share-destination-check"/></div>
          <label className="feed-share-caption-label" htmlFor="feed-share-caption">تحب تضيف تعليق مع المشاركة؟ <span>(اختياري)</span></label>
          <textarea id="feed-share-caption" className="field feed-share-caption" value={shareCaption} onChange={event => setShareCaption(event.target.value)} maxLength={5000} placeholder="اكتب رأيك أو قول لزملائك إيه اللي لفت نظرك في المنشور…" disabled={shareBusy}/>
          <div className="feed-share-source"><span className="avatar sm" style={{ background: sharingPost.shared_avatar_color || sharingPost.avatar_color || "var(--blue)" }}>{(sharingPost.shared_display_name || sharingPost.display_name).slice(0, 1)}</span><div><strong>{sharingPost.shared_display_name || sharingPost.display_name}</strong><p>{sharingPost.shared_body || sharingPost.body || "منشور من مجتمع AXIS"}</p></div></div>
          <p className="feed-share-groups-note">إعادة النشر دي هتظهر على حسابك داخل المجتمع.</p>
          <footer className="feed-share-dialog-actions"><button type="button" className="btn" disabled={shareBusy} onClick={() => setSharingPost(null)}>إلغاء</button><button type="button" className="btn btn-primary" disabled={shareBusy} onClick={() => void confirmInternalShare()}><Share2 size={16}/>{shareBusy ? "جارٍ المشاركة…" : "مشاركة على حسابي"}</button></footer>
        </section>
      </div>}
    </>
)}</LocalizedContent>;
}
