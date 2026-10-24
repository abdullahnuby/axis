"use client";
import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import type { SessionUser } from "@/lib/types";
import { Toast } from "@/components/Toast";

type Notification = { id: string; kind: string; message: string; target_post_id: string | null; is_read: boolean; created_at: string; actor_name: string | null };
export function NotificationsClient({ user }: { user: SessionUser }) {
  const [items, setItems] = useState<Notification[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { void (async () => { const res = await fetch("/api/notifications", { cache: "no-store" }); const data = await res.json(); if (res.ok) setItems(data.notifications || []); else setError(data.error || "مش قادرين نحمّل الإشعارات دلوقتي. جرّب تاني."); })(); }, []);
  async function markRead() { setBusy(true); const res = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true }) }); if (res.ok) setItems(old => old.map(n => ({ ...n, is_read: true }))); else setError("ما قدرناش نحدّث الإشعارات. جرّب تاني."); setBusy(false); }
  return <AppShell user={user} active="/notifications"><div className="between"><div><h1 className="page-title">الإشعارات</h1><p className="small muted" style={{ margin: 0 }}>هنا هتلاقي الإعجابات والتعليقات والردود وكل جديد يخص حسابك.</p></div><button className="btn btn-small" onClick={markRead} disabled={busy || !items.some(n => !n.is_read)}><CheckCheck size={16}/> تعليم الكل كمقروء</button></div><Toast message={error} error/>{items.length ? items.map(item => <article className="card" key={item.id} style={{ padding: 15, display: "flex", gap: 12, alignItems: "flex-start", background: item.is_read ? "#fff" : "#FFFDF5" }}><div className="avatar sm" style={{ background: "var(--gold-soft)", color: "#075E64" }}><Bell size={16}/></div><div style={{ flex: 1 }}><div>{item.message}</div><div className="tiny muted">{new Date(item.created_at).toLocaleString("ar-EG")}{!item.is_read && <span className="pill gold" style={{ marginInlineStart: 8 }}>جديد</span>}</div></div></article>) : <div className="empty-state"><Bell size={25}/><h2 className="section-title">لسه مفيش إشعارات</h2><p className="small">أول ما حد يتفاعل مع مشاركاتك أو يوصلك تنبيه، هتلاقيه هنا.</p></div>}</AppShell>;
}
