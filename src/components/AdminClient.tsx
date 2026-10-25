"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Users, ClipboardCheck, Flag, CalendarDays, RefreshCw, LogOut, CheckCircle2, XCircle, FileText, Eye, History, Search, ShieldCheck, X } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Toast } from "@/components/Toast";
import { BADGE_OPTIONS, SPECIALTIES } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";

type Doc = { id: string; category: string; original_name: string; content_type: string; size_bytes: number };
type RequestRow = { id: string; user_id: string; username: string; display_name: string; email: string; legal_name: string; membership_number: string; status: string; applicant_note: string | null; review_note: string | null; specialty: string | null; created_at: string; documents: Doc[] };
type Member = { id: string; username: string; display_name: string; email: string; role: string; verification_status: string; account_status: string; seniority_code: string; approved_years: string | number | null; specialty: string | null; created_at: string };
type Report = { id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string; reporter: string; target_summary: string | null };
type Event = { id: string; title: string; description: string | null; location: string | null; event_url: string | null; starts_at: string | null; is_published: boolean };
type Overview = { pending: number; needsInfo: number; verified: number; members: number; openReports: number; posts: number };
type AuditEntry = { id: string; action: string; target_type: string | null; target_id: string | null; metadata: Record<string, unknown>; created_at: string; actor_name: string };
const tabs = [{ id: "requests", label: "طلبات التوثيق", Icon: ClipboardCheck }, { id: "members", label: "إدارة الأعضاء", Icon: Users }, { id: "reports", label: "البلاغات", Icon: Flag }, { id: "events", label: "الفعاليات", Icon: CalendarDays }, { id: "audit", label: "سجل القرارات", Icon: History }];
function tabsForRole(role: SessionUser["role"]) {
  if (role === "admin") return tabs;
  if (role === "reviewer") return tabs.filter(t => t.id === "requests");
  if (role === "moderator") return tabs.filter(t => t.id === "reports" || t.id === "events");
  return [];
}


function formatAdminDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
function formatAdminDateTime(value: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function adminPageTitle(tab: string) {
  return ({ requests: "طلبات توثيق العضوية", members: "إدارة الأعضاء", reports: "البلاغات", events: "الفعاليات", audit: "سجل القرارات" } as Record<string, string>)[tab] || "لوحة التحكم";
}
function adminPageDescription(tab: string) {
  return ({ requests: "راجع الطلبات والمستندات واتخذ قرار التوثيق يدويًا.", members: "إدارة حالة حسابات أعضاء المجتمع.", reports: "مراجعة البلاغات المسجلة من الأعضاء.", events: "إدارة الأحداث والفعاليات الهندسية.", audit: "متابعة الإجراءات الإدارية التي تم تسجيلها." } as Record<string, string>)[tab] || "إدارة مجتمع AXIS.";
}
function verificationStatusLabel(status: string) {
  return ({ pending: "قيد المراجعة", needs_info: "مطلوب استكمال", approved: "معتمدة", rejected: "مرفوضة" } as Record<string, string>)[status] || status;
}
function auditActionLabel(action: string) {
  return ({ verification_submitted: "تقديم طلب توثيق", verification_approved: "اعتماد عضوية هندسية", verification_rejected: "رفض طلب توثيق", verification_more_info: "طلب استكمال بيانات", member_suspended: "إيقاف حساب عضو", member_reactivated: "إعادة تفعيل حساب عضو", report_resolved: "معالجة بلاغ", event_created: "إضافة فعالية", event_deleted: "حذف فعالية" } as Record<string, string>)[action] || action.replaceAll("_", " ");
}
function auditTargetLabel(target: string) {
  return ({ verification_request: "طلب توثيق", user: "عضو", report: "بلاغ", event: "فعالية" } as Record<string, string>)[target] || target;
}

export function AdminClient({ admin }: { admin: SessionUser }) {
  const availableTabs = tabsForRole(admin.role);
  const [tab, setTab] = useState(admin.role === "moderator" ? "reports" : "requests"); const [overview, setOverview] = useState<Overview>({ pending: 0, needsInfo: 0, verified: 0, members: 0, openReports: 0, posts: 0 });
  const [requests, setRequests] = useState<RequestRow[]>([]); const [selected, setSelected] = useState<RequestRow | null>(null); const [members, setMembers] = useState<Member[]>([]); const [reports, setReports] = useState<Report[]>([]); const [events, setEvents] = useState<Event[]>([]); const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending"); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const [approvedYears, setApprovedYears] = useState("0"); const [jobTitle, setJobTitle] = useState(""); const [specialty, setSpecialty] = useState("مدني"); const [badges, setBadges] = useState<string[]>([]); const [expertApproved, setExpertApproved] = useState(false); const [reviewNote, setReviewNote] = useState("");
  const [eventForm, setEventForm] = useState({ title: "", description: "", location: "", event_url: "", starts_at: "" });

  const loadOverview = useCallback(async () => { const r = await fetch("/api/admin/overview", { cache: "no-store" }); const d = await r.json(); if (r.ok) setOverview(d.overview); else setError(d.error || "تعذر تحميل الملخص."); }, []);
  const loadRequests = useCallback(async () => {
    const r = await fetch(`/api/admin/verifications?status=${statusFilter}`, { cache: "no-store" });
    const d = await r.json();
    if (r.ok) {
      const nextRequests: RequestRow[] = d.requests || [];
      setRequests(nextRequests);
      setSelected((current) => current ? (nextRequests.find((x) => x.id === current.id) || nextRequests[0] || null) : (nextRequests[0] || null));
    } else setError(d.error || "تعذر تحميل الطلبات.");
  }, [statusFilter]);
  const loadMembers = useCallback(async () => { const r = await fetch("/api/admin/members", { cache: "no-store" }); const d = await r.json(); if (r.ok) setMembers(d.members || []); else setError(d.error || "تعذر تحميل الأعضاء."); }, []);
  const loadReports = useCallback(async () => { const r = await fetch("/api/admin/reports", { cache: "no-store" }); const d = await r.json(); if (r.ok) setReports(d.reports || []); else setError(d.error || "تعذر تحميل البلاغات."); }, []);
  const loadEvents = useCallback(async () => { const r = await fetch("/api/admin/events", { cache: "no-store" }); const d = await r.json(); if (r.ok) setEvents(d.events || []); else setError(d.error || "تعذر تحميل الأحداث."); }, []);
  const loadAudit = useCallback(async () => { const r = await fetch("/api/admin/audit", { cache: "no-store" }); const d = await r.json(); if (r.ok) setAuditLogs(d.entries || []); else setError(d.error || "تعذر تحميل سجل القرارات."); }, []);
  useEffect(() => { void loadOverview(); }, [loadOverview]);
  useEffect(() => { if (tab === "requests") void loadRequests(); if (tab === "members") void loadMembers(); if (tab === "reports") void loadReports(); if (tab === "events") void loadEvents(); if (tab === "audit" && admin.role === "admin") void loadAudit(); }, [tab, loadRequests, loadMembers, loadReports, loadEvents, loadAudit, admin.role]);
  useEffect(() => {
    if (!selected) return;
    setApprovedYears("0"); setJobTitle(""); setSpecialty(selected.specialty || "مدني"); setBadges([]); setExpertApproved(false); setReviewNote(selected.review_note || "");
  }, [selected?.id]);

  function selectRequest(request: RequestRow) { setSelected(request); }

  async function decide(action: "approve" | "reject" | "needs_info") {
    if (!selected) return; setBusy(true); setError(""); setMessage("");
    try { const r = await fetch(`/api/admin/verifications/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note: reviewNote, approvedYears: Number(approvedYears), jobTitle, specialty, badges, expertApproved }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "تعذر حفظ قرار المراجعة."); setMessage(action === "approve" ? "تم قبول التوثيق وفتح الحساب." : action === "reject" ? "تم رفض الطلب." : "تم طلب استكمال البيانات."); setSelected(null); await Promise.all([loadRequests(), loadOverview()]); }
    catch (e) { setError(e instanceof Error ? e.message : "حدث خطأ."); } finally { setBusy(false); }
  }
  async function toggleMember(member: Member) {
    const accountStatus = member.account_status === "suspended" ? "active" : "suspended";
    if (accountStatus === "suspended" && !window.confirm(`متأكد إنك عايز توقف حساب ${member.display_name}؟ هيتسجل خروجه من الجلسات الحالية.`)) return;
    setError(""); setMessage("");
    try {
      const r = await fetch(`/api/admin/members/${member.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountStatus }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "تعذر تعديل الحساب.");
      setMembers(old => old.map(m => m.id === member.id ? { ...m, account_status: accountStatus } : m));
      setMessage(accountStatus === "suspended" ? "تم إيقاف الحساب وإنهاء جلساته." : "تم إعادة تفعيل الحساب.");
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر تعديل الحساب."); }
  }
  async function resolveReport(report: Report, status: "reviewed" | "dismissed") {
    setError(""); setMessage("");
    try {
      const r = await fetch(`/api/admin/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "تعذر تحديث حالة البلاغ.");
      setReports(old => old.map(x => x.id === report.id ? { ...x, status } : x));
      setMessage("تم تحديث حالة البلاغ.");
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر تحديث حالة البلاغ."); }
  }
  async function applyReportAction(report: Report) {
    const action = report.target_type === "post" ? "حذف المنشور" : report.target_type === "comment" ? "حذف التعليق وردوده التابعة" : "إيقاف حساب العضو";
    if (!window.confirm(`ده إجراء فعلي: ${action}. مش هينفع التراجع عنه من لوحة البلاغات. متأكد؟`)) return;
    setError(""); setMessage(""); setBusy(true);
    try {
      const r = await fetch(`/api/admin/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "actioned", applyAction: true }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "ما قدرناش ننفذ الإجراء.");
      setReports(old => old.map(x => x.id === report.id ? { ...x, status: "actioned" } : x));
      setMessage(d.message || "تم تنفيذ الإجراء وإغلاق البلاغ.");
      await loadOverview();
    } catch (e) { setError(e instanceof Error ? e.message : "ما قدرناش ننفذ الإجراء."); }
    finally { setBusy(false); }
  }
  async function createEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    try { const r = await fetch("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventForm) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "تعذر إنشاء الحدث."); setEvents(old => [d.event, ...old]); setEventForm({ title: "", description: "", location: "", event_url: "", starts_at: "" }); setMessage("تمت إضافة الحدث."); }
    catch (e) { setError(e instanceof Error ? e.message : "حدث خطأ."); } finally { setBusy(false); }
  }
  async function deleteEvent(eventId: string) {
    if (!window.confirm("متأكد إنك عايز تحذف الحدث ده؟")) return;
    setError(""); setMessage("");
    try {
      const r = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "تعذر حذف الحدث.");
      setEvents(old => old.filter(e => e.id !== eventId));
      setMessage("اتحذف الحدث.");
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر حذف الحدث."); }
  }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/admin/login"; }

  return <div className="admin-layout"><aside className="admin-sidebar">
    <div className="admin-brand-row"><Brand admin light /></div>
    <nav className="admin-nav-scroll" aria-label="أقسام الإدارة">{availableTabs.map(({ id, label, Icon }) => <button key={id} className={`nav-link ${tab === id ? "active" : ""}`} onClick={() => { setTab(id); setSelected(null); }} style={{ border: 0, textAlign: "right", background: tab === id ? "#0F3A55" : "transparent", width: "100%" }}><Icon size={18}/>{label}{id === "requests" && overview.pending > 0 ? <span className="pill gold" style={{ marginInlineStart: "auto" }}>{overview.pending}</span> : null}</button>)}</nav>
    <div className="admin-sidebar-footer"><div className="small admin-signed-in" style={{ padding: "8px", color: "#9FB0CB" }}>مسجل كـ {admin.display_name}</div><Link href="/feed" className="nav-link admin-feed-link"><Users size={17}/> دخول المنصة</Link><button className="nav-link admin-logout" onClick={logout}><LogOut size={17}/>تسجيل الخروج</button></div>
  </aside><main className="admin-main"><div className="between admin-page-heading" style={{ marginBottom: 22 }}><div><h1 className="page-title">{adminPageTitle(tab)}</h1><p className="small muted" style={{ margin: 0 }}>{adminPageDescription(tab)}</p></div><button className="btn btn-small" onClick={() => { void loadOverview(); if (tab === "requests") void loadRequests(); if (tab === "members") void loadMembers(); if (tab === "reports") void loadReports(); if (tab === "events") void loadEvents(); if (tab === "audit") void loadAudit(); }}><RefreshCw size={15}/> تحديث البيانات</button></div>
    <Toast message={error} error/><Toast message={message}/>
    <div className="stat-grid admin-overview-grid" style={{ marginBottom: 22 }}>
      <div className="card stat"><span className="admin-stat-label"><span className="admin-stat-dot amber"/>طلبات قيد المراجعة</span><strong className="stat-number">{overview.pending}</strong><span className="admin-stat-hint">تحتاج قرار الإدارة</span></div>
      <div className="card stat"><span className="admin-stat-label"><span className="admin-stat-dot blue"/>بانتظار الاستكمال</span><strong className="stat-number">{overview.needsInfo}</strong><span className="admin-stat-hint">بيانات ناقصة من المتقدم</span></div>
      <div className="card stat"><span className="admin-stat-label"><span className="admin-stat-dot green"/>أعضاء موثقون</span><strong className="stat-number">{overview.verified}</strong><span className="admin-stat-hint">عضوية مفعّلة</span></div>
      <div className="card stat"><span className="admin-stat-label"><span className="admin-stat-dot red"/>بلاغات مفتوحة</span><strong className="stat-number">{overview.openReports}</strong><span className="admin-stat-hint">تحتاج مراجعة</span></div>
    </div>

    {tab === "requests" && <section className="stack admin-verification-page">
      <div className="admin-section-heading"><div><h2 className="section-title">مراجعة الطلبات</h2><p className="small muted">راجع هوية المتقدم ومستنداته قبل اعتماد العضوية.</p></div><span className="pill navy"><ShieldCheck size={13}/> مراجعة موثّقة</span></div>
      <div className="admin-review-workspace">
        <section className="card admin-requests-panel">
          <div className="admin-panel-heading"><div><h3 className="section-title">قائمة الطلبات</h3><p className="tiny muted">{requests.length.toLocaleString("ar-EG-u-nu-latn")} طلب في العرض الحالي</p></div><label className="admin-status-filter"><span className="tiny muted">الحالة</span><select className="field" aria-label="تصفية الطلبات حسب الحالة" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="pending">قيد المراجعة</option><option value="needs_info">تحتاج استكمالًا</option><option value="rejected">مرفوضة</option><option value="approved">مقبولة</option><option value="all">كل الطلبات</option></select></label></div>
          <div className="admin-verification-table-wrap"><table className="admin-verification-table"><thead><tr><th>اسم الظهور</th><th>التخصص</th><th>تاريخ الطلب</th><th>الحالة</th></tr></thead><tbody>
            {requests.map(req => <tr key={req.id} tabIndex={0} aria-selected={selected?.id === req.id} className={selected?.id === req.id ? "is-selected" : ""} onClick={() => selectRequest(req)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectRequest(req); } }}>
              <td><strong>{req.display_name}</strong><span className="admin-table-secondary">@{req.username}</span></td><td>{req.specialty || "غير محدد"}</td><td><time dateTime={req.created_at}>{formatAdminDate(req.created_at)}</time></td><td><span className={`pill ${req.status === "approved" ? "green" : req.status === "rejected" ? "red" : req.status === "needs_info" ? "navy" : "gold"}`}>{verificationStatusLabel(req.status)}</span></td>
            </tr>)}
          </tbody></table>{!requests.length && <div className="empty-state admin-empty-state"><ClipboardCheck size={24}/><strong>لا توجد طلبات بهذه الحالة</strong><span className="small">جرّب اختيار حالة أخرى من القائمة.</span></div>}</div>
          <div className="admin-verification-mobile-list">{requests.map(req => <button type="button" key={req.id} className={`admin-verification-mobile-card ${selected?.id === req.id ? "is-selected" : ""}`} onClick={() => selectRequest(req)} aria-pressed={selected?.id === req.id}>
            <span className="admin-mobile-request-top"><strong>{req.display_name}</strong><span className={`pill ${req.status === "approved" ? "green" : req.status === "rejected" ? "red" : req.status === "needs_info" ? "navy" : "gold"}`}>{verificationStatusLabel(req.status)}</span></span><span className="admin-table-secondary">@{req.username} · {req.specialty || "غير محدد"}</span><span className="admin-mobile-request-date">{formatAdminDate(req.created_at)} <span>·</span> {req.documents.length.toLocaleString("ar-EG-u-nu-latn")} مستند</span>
          </button>)}{!requests.length && <div className="empty-state admin-mobile-empty"><ClipboardCheck size={22}/><strong>لا توجد طلبات بهذه الحالة</strong><span className="small">جرّب اختيار حالة أخرى من القائمة.</span></div>}</div>
        </section>

        <aside className="card admin-review-panel" aria-live="polite">
          {selected ? <>
            <div className="admin-review-panel-heading"><div><span className="admin-review-kicker">ملف قيد المراجعة</span><h3 className="section-title">{selected.legal_name}</h3><p className="tiny muted">حساب @{selected.username}</p></div><button type="button" className="icon-btn admin-clear-selection" aria-label="إلغاء تحديد الطلب" onClick={() => setSelected(null)}><X size={16}/></button></div>
            <div className="admin-review-facts"><div><span>البريد الإلكتروني</span><strong dir="ltr">{selected.email}</strong></div><div><span>رقم العضوية</span><strong className="admin-membership-number" dir="ltr">{selected.membership_number}</strong></div><div><span>التخصص</span><strong>{selected.specialty || "غير محدد"}</strong></div><div><span>تاريخ التقديم</span><strong>{formatAdminDate(selected.created_at)}</strong></div></div>
            {selected.applicant_note ? <div className="admin-applicant-note"><span className="label">ملاحظة المتقدم</span><p>{selected.applicant_note}</p></div> : null}
            <div className="admin-documents-section"><div className="admin-subsection-heading"><span className="label">المستندات المرفوعة</span><span className="pill navy">{selected.documents.length.toLocaleString("ar-EG-u-nu-latn")}</span></div>
              {selected.documents.length ? <div className="admin-document-list">{selected.documents.map(doc => <a key={doc.id} className="admin-document-link" target="_blank" rel="noreferrer" href={`/api/admin/documents/${doc.id}`}><span className="admin-document-icon"><FileText size={17}/></span><span className="admin-document-meta"><strong>{doc.category === "membership" ? "بطاقة العضوية النقابية" : doc.category === "experience" ? "إثبات الخبرة" : doc.category === "qualification" ? "مؤهل أكاديمي" : doc.category === "certificate" ? "شهادة مهنية" : doc.category}</strong><span>{doc.original_name} · {(doc.size_bytes / 1024).toFixed(0)} KB</span></span><Eye size={15}/></a>)}</div> : <div className="alert error">لا توجد مستندات مرفوعة لهذا الطلب.</div>}
            </div>
            <div className="admin-review-form"><div className="admin-subsection-heading"><h4 className="section-title">بيانات الاعتماد</h4><span className="tiny muted">لا تحفظ إلا بعد اتخاذ القرار</span></div>
              <div className="form-grid"><div className="form-row"><label className="label">سنوات الخبرة</label><input className="field" type="number" min="0" max="60" step="0.5" value={approvedYears} onChange={e => setApprovedYears(e.target.value)}/></div><div className="form-row"><label className="label">المسمى الوظيفي المثبت</label><input className="field" value={jobTitle} maxLength={100} onChange={e => setJobTitle(e.target.value)} placeholder="مثال: مدير مشروع"/></div><div className="form-row"><label className="label">التخصص المعتمد</label><select className="field" value={specialty} onChange={e => setSpecialty(e.target.value)}>{SPECIALTIES.map(s => <option key={s}>{s}</option>)}</select></div></div>
              <div className="form-row"><span className="label">المؤهلات والشارات التي تم التحقق منها</span><div className="admin-badge-options">{BADGE_OPTIONS.map(b => <label key={b.code} className={`admin-badge-option ${badges.includes(b.code) ? "is-checked" : ""}`}><input type="checkbox" checked={badges.includes(b.code)} onChange={e => setBadges(old => e.target.checked ? [...old,b.code] : old.filter(x => x !== b.code))}/><span className="pill navy">{b.code}</span><span>{b.label}</span></label>)}</div></div>
              <label className="admin-expert-option"><input type="checkbox" checked={expertApproved} onChange={e => setExpertApproved(e.target.checked)}/><span><strong>اعتماد مستوى EXP</strong><small>يتطلب 10 سنوات خبرة على الأقل ومراجعة المسؤوليات.</small></span></label>
              <div className="form-row"><label className="label">ملاحظة القرار للمتقدم</label><textarea className="field" value={reviewNote} onChange={e => setReviewNote(e.target.value)} maxLength={1000} placeholder="اكتب سبب الرفض أو المستند المطلوب استكماله…"/></div>
              <div className="admin-decision-actions"><button className="btn btn-success" disabled={busy} onClick={() => decide("approve")}><CheckCircle2 size={16}/>{busy ? "جارٍ الحفظ…" : "قبول وفتح المجتمع"}</button><div className="admin-decision-secondary"><button className="btn btn-outline-blue" disabled={busy} onClick={() => decide("needs_info")}>طلب استكمال</button><button className="btn btn-danger" disabled={busy} onClick={() => decide("reject")}><XCircle size={15}/> رفض الطلب</button></div></div>
            </div>
          </> : <div className="admin-review-placeholder"><span className="admin-review-placeholder-icon"><Search size={22}/></span><h3>اختر طلبًا لمراجعته</h3><p>حدد أحد المتقدمين من القائمة لعرض بياناته ومستنداته واتخاذ قرار التوثيق.</p><div className="admin-review-placeholder-steps"><span><CheckCircle2 size={15}/> راجع بيانات العضو</span><span><FileText size={15}/> افحص المستندات</span><span><ShieldCheck size={15}/> اعتمد المؤهلات المثبتة فقط</span></div></div>}
        </aside>
      </div>
    </section>}

    {tab === "members" && <section className="stack"><h2 className="section-title">إدارة الأعضاء</h2><div className="table-wrap"><table><thead><tr><th>العضو</th><th>الحالة</th><th>المستوى</th><th>تاريخ التسجيل</th><th>الإجراء</th></tr></thead><tbody>{members.map(m => <tr key={m.id}><td><strong>{m.display_name}</strong><div className="tiny muted">@{m.username} · {m.email}</div></td><td><span className={`pill ${m.verification_status === "verified" ? "green" : "gold"}`}>{m.verification_status}</span><div className="tiny muted">{m.account_status}</div></td><td>{m.seniority_code} {m.approved_years != null ? `· ${m.approved_years} سنة` : ""}</td><td className="small">{new Date(m.created_at).toLocaleDateString("ar-EG-u-nu-latn")}</td><td><button className={`btn btn-small ${m.account_status === "suspended" ? "btn-primary" : "btn-danger"}`} disabled={m.id === admin.id} onClick={() => toggleMember(m)}>{m.account_status === "suspended" ? "إعادة تفعيل" : "إيقاف الحساب"}</button></td></tr>)}</tbody></table>{!members.length && <div className="empty-state">لا يوجد أعضاء لعرضهم.</div>}</div></section>}

    {tab === "reports" && <section className="stack"><h2 className="section-title">البلاغات</h2>{reports.map(report => <div className="request-item" key={report.id}><div className="between"><strong>{report.target_type} · {report.reporter}</strong><span className={`pill ${report.status === "open" ? "gold" : "green"}`}>{report.status}</span></div><p style={{ margin: "8px 0" }}>{report.reason}</p><p className="small muted">{report.target_summary || `العنصر: ${report.target_id}`} · {new Date(report.created_at).toLocaleString("ar-EG-u-nu-latn")}</p>{report.status === "open" && <div className="row" style={{ flexWrap: "wrap" }}><button className="btn btn-small" disabled={busy} onClick={() => resolveReport(report,"reviewed")}>تمت المراجعة</button><button className="btn btn-small" disabled={busy} onClick={() => resolveReport(report,"dismissed")}>استبعاد البلاغ</button><button className="btn btn-small btn-danger" disabled={busy || (report.target_type === "user" && admin.role !== "admin")} title={report.target_type === "user" && admin.role !== "admin" ? "إيقاف الحسابات متاح لمدير النظام فقط" : undefined} onClick={() => void applyReportAction(report)}>{report.target_type === "post" ? "حذف المنشور وإغلاق البلاغ" : report.target_type === "comment" ? "حذف التعليق وإغلاق البلاغ" : admin.role === "admin" ? "إيقاف الحساب وإغلاق البلاغ" : "إيقاف الحساب (للمدير فقط)"}</button></div>}</div>)}{!reports.length && <div className="empty-state">لا توجد بلاغات.</div>}</section>}

    {tab === "events" && <section className="stack"><h2 className="section-title">إدارة الفعاليات</h2><form className="card card-pad form-stack" onSubmit={createEvent}><h3 className="section-title">إضافة حدث</h3><div className="form-row"><label className="label">عنوان الحدث</label><input className="field" value={eventForm.title} onChange={e => setEventForm({...eventForm,title:e.target.value})} maxLength={160} required/></div><div className="form-grid"><div className="form-row"><label className="label">المكان</label><input className="field" value={eventForm.location} onChange={e => setEventForm({...eventForm,location:e.target.value})} maxLength={200}/></div><div className="form-row"><label className="label">الرابط (اختياري)</label><input className="field" type="url" value={eventForm.event_url} onChange={e => setEventForm({...eventForm,event_url:e.target.value})} placeholder="https://…"/></div></div><div className="form-row"><label className="label">التاريخ والوقت</label><input className="field" type="datetime-local" value={eventForm.starts_at} onChange={e => setEventForm({...eventForm,starts_at:e.target.value})}/></div><div className="form-row"><label className="label">وصف مختصر</label><textarea className="field" value={eventForm.description} onChange={e => setEventForm({...eventForm,description:e.target.value})} maxLength={1000}/></div><button className="btn btn-primary" disabled={busy}>إضافة الحدث</button></form>{events.map(event => <div className="request-item" key={event.id}><div className="between"><strong>{event.title}</strong><button className="btn btn-small btn-danger" onClick={() => deleteEvent(event.id)}>حذف</button></div><p className="small muted" style={{ margin: "5px 0 0" }}>{event.starts_at ? new Date(event.starts_at).toLocaleString("ar-EG-u-nu-latn") : "بدون موعد محدد"}{event.location ? ` · ${event.location}` : ""}</p>{event.description && <p className="small">{event.description}</p>}</div>)}</section>}

    {tab === "audit" && admin.role === "admin" && <section className="stack admin-audit-page"><div className="admin-section-heading"><div><h2 className="section-title">سجل قرارات الإدارة</h2><p className="small muted">سجل زمني للإجراءات الإدارية المسجلة في النظام.</p></div><span className="pill navy"><History size={13}/> آخر 100 إجراء</span></div><div className="card admin-audit-list">{auditLogs.map(entry => <article className="admin-audit-row" key={entry.id}><span className="admin-audit-icon"><History size={17}/></span><div className="admin-audit-detail"><strong>{auditActionLabel(entry.action)}</strong><p>{entry.actor_name} · {entry.target_type ? auditTargetLabel(entry.target_type) : "إجراء عام"}{entry.target_id ? ` · ${entry.target_id.slice(0, 8)}` : ""}</p></div><time dateTime={entry.created_at}>{formatAdminDateTime(entry.created_at)}</time></article>)}{!auditLogs.length && <div className="empty-state">لا توجد قرارات مسجلة بعد.</div>}</div></section>}
  </main></div>;
}
