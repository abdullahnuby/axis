"use client";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Heart, MessageCircle, Send, Share2, ShieldCheck, Sparkles, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import type { SessionUser } from "@/lib/types";
import { Toast } from "@/components/Toast";

type Notification = { id: string; kind: string; message: string; target_post_id: string | null; target_comment_id: string | null; target_conversation_id: string | null; target_group_id: string | null; target_user_id: string | null; is_read: boolean; created_at: string; actor_name: string | null; actor_username: string | null };
export function NotificationsClient({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "مش قادرين نحمّل الإشعارات دلوقتي. جرّب تاني.");
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "مش قادرين نحمّل الإشعارات دلوقتي. جرّب تاني."); }
  }, []);
  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 25_000);
    document.addEventListener("visibilitychange", load);
    window.addEventListener("focus", load);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", load); window.removeEventListener("focus", load); };
  }, [load]);
  async function markRead() { setBusy(true); setError(""); try { const res = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "ما قدرناش نحدّث الإشعارات. جرّب تاني."); setItems(old => old.map(n => ({ ...n, is_read: true }))); window.dispatchEvent(new Event("axis-notifications-updated")); } catch (caught) { setError(caught instanceof Error ? caught.message : "ما قدرناش نحدّث الإشعارات. جرّب تاني."); } finally { setBusy(false); } }
  async function openNotification(event: MouseEvent<HTMLAnchorElement>, item: Notification) {
    event.preventDefault();
    setError("");
    if (!item.is_read) {
      try {
        const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "ما قدرناش نعلّم الإشعار كمقروء.");
        setItems(old => old.map(n => n.id === item.id ? { ...n, is_read: true } : n));
        window.dispatchEvent(new Event("axis-notifications-updated"));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "ما قدرناش نحدّث الإشعار. جرّب تاني.");
        return;
      }
    }
    router.push(target(item));
  }
  function target(item: Notification) { if(item.target_conversation_id)return `/messages/${item.target_conversation_id}`;if(item.target_group_id)return `/groups/${item.target_group_id}`;if(item.target_post_id)return `/feed?post=${item.target_post_id}${item.target_comment_id?`#comment-${item.target_comment_id}`:""}`;if(item.target_user_id&&item.actor_username)return `/people/${encodeURIComponent(item.actor_username)}`;return "/notifications"; }
  function iconFor(kind:string){if(kind==="like")return <Heart size={16}/>;if(kind==="comment")return <MessageCircle size={16}/>;if(kind==="follow")return <UserPlus size={16}/>;if(kind==="share")return <Share2 size={16}/>;if(kind==="message")return <Send size={16}/>;if(kind==="group")return <Users size={16}/>;return <Bell size={16}/>;}
  return <AppShell user={user} active="/notifications"><section className="notifications-page-hero">
 <div className="notifications-page-copy">
  <div className="directory-eyebrow"><span className="directory-eyebrow-icon"><Bell size={14}/></span><span>AXIS / ACTIVITY CENTER</span><span className="directory-eyebrow-divider"/><span>مركز النشاط</span></div>
  <h1>خليك قريب <span>من اللي بيحصل.</span></h1>
  <p>التفاعلات على مشاركاتك، التعليقات، والرسائل الجديدة؛ كل تحديث له مكان واضح هنا.</p>
  <div className="notifications-page-counts">
   <div className="notification-count-tile"><span className="notification-count-label"><Sparkles size={13}/> جديد</span><strong>{items.filter(item => !item.is_read).length.toLocaleString("en-US")}</strong><small>إشعارات غير مقروءة</small></div>
   <div className="notification-count-tile muted-tile"><span className="notification-count-label"><ShieldCheck size={13}/> نشاطك</span><strong>{items.length.toLocaleString("en-US")}</strong><small>إجمالي الإشعارات الظاهرة</small></div>
  </div>
 </div>
 <div className="notifications-page-visual" aria-hidden="true">
  <div className="notification-visual-orbit"/>
  <div className="notification-visual-core"><Bell size={26}/><span/></div>
  <div className="notification-visual-card visual-card-one"><Heart size={15}/><i/><i/></div>
  <div className="notification-visual-card visual-card-two"><MessageCircle size={15}/><i/><i/></div>
  <div className="notification-visual-card visual-card-three"><Users size={15}/><i/></div>
  <span className="notification-visual-label">ACTIVITY / LIVE</span>
 </div>
 <div className="notifications-page-actions"><span><i/> آخر التحديثات بتظهر هنا</span><button className="btn btn-small" onClick={markRead} disabled={busy || !items.some(n => !n.is_read)}><CheckCheck size={15}/>{busy ? "جارٍ التحديث…" : "تعليم الكل كمقروء"}</button></div>
</section><Toast message={error} error/>{items.length ? items.map(item => <Link href={target(item)} onClick={event=>void openNotification(event,item)} className={`card notification-card ${item.is_read?"":"notification-unread"}`} key={item.id}><div className="notification-icon">{iconFor(item.kind)}</div><div className="notification-copy"><div>{item.message}</div><div className="tiny muted">{new Date(item.created_at).toLocaleString("ar-EG-u-nu-latn")}{!item.is_read && <span className="pill navy" style={{ marginInlineStart: 8 }}>جديد</span>}</div></div><span className="notification-open">افتح <span aria-hidden="true">←</span></span></Link>) : <div className="empty-state"><Bell size={25}/><h2 className="section-title">لسه مفيش إشعارات</h2><p className="small">أول ما حد يتفاعل مع مشاركاتك أو يوصلك تنبيه، هتلاقيه هنا.</p></div>}</AppShell>;
}
