"use client";
import { useState, type FormEvent } from "react";
import { ShieldCheck, Upload, Clock3, FileCheck2 } from "lucide-react";
import { Toast } from "@/components/Toast";
import { SPECIALTIES } from "@/lib/constants";

export function VerificationClient({ initialStatus, reviewNote, legalName, submittedAt }: { initialStatus: string; reviewNote?: string | null; legalName?: string | null; submittedAt?: string | null }) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [specialty, setSpecialty] = useState("مدني");
  const [note, setNote] = useState("");
  const [legal, setLegal] = useState(legalName || "");
  const locked = status === "pending" || status === "verified";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    const formData = new FormData(event.currentTarget);
    formData.set("specialty", specialty);
    formData.set("applicantNote", note);
    try {
      const response = await fetch("/api/verification", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر إرسال الطلب.");
      setStatus("pending"); setSuccess("تم إرسال طلبك. ستظل المنصة مغلقة حتى تنتهي المراجعة اليدوية.");
    } catch (e) { setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع."); }
    finally { setBusy(false); }
  }
  return <div className="status-layout">
    <section className="card status-card">
      <div className="row"><div className="avatar" style={{ background: "var(--gold-soft)", color: "#735000" }}><ShieldCheck size={23}/></div><div><h1 className="section-title">تفعيل العضوية الهندسية</h1><div className="small muted">المراجعة يدوية بالكامل في النسخة الحالية.</div></div></div>
      <div className="alert">لا يمكنك رؤية المنشورات أو ملفات الأعضاء قبل الموافقة على التوثيق.</div>
      <Toast message={error} error/><Toast message={success}/>
      {status === "verified" ? <div className="alert success"><FileCheck2 size={18} style={{ verticalAlign: "middle", marginLeft: 7 }}/> تم توثيق عضويتك. يمكنك الآن دخول المجتمع.</div> : status === "pending" ? <div className="stack"><span className="status-pill"><Clock3 size={15}/> الطلب قيد المراجعة</span><p style={{ margin: 0 }}>تم إرسال طلب التوثيق {submittedAt ? `في ${new Date(submittedAt).toLocaleDateString("ar-EG")}` : ""}. ستتغير حالة الحساب بعد قرار الإدارة.</p><p className="small muted" style={{ margin: 0 }}>لتصحيح أي بيانات، انتظر طلب استكمال من الإدارة أو تواصل مع مسؤول المنصة.</p></div> : <form className="form-stack" onSubmit={submit}>
        {status === "rejected" && <div className="alert error">تم رفض الطلب السابق. يمكنك إعادة التقديم بمستندات أوضح. {reviewNote ? `ملاحظة الإدارة: ${reviewNote}` : ""}</div>}
        {status === "needs_info" && <div className="alert">طلبت الإدارة استكمال معلومات. {reviewNote || "أرسل البيانات المطلوبة مرة أخرى."}</div>}
        <div className="form-grid"><div className="form-row"><label className="label" htmlFor="legalName">الاسم الحقيقي كما في إثبات العضوية</label><input id="legalName" name="legalName" className="field" value={legal} onChange={e => setLegal(e.target.value)} required maxLength={120}/></div><div className="form-row"><label className="label" htmlFor="membershipNumber">رقم عضوية النقابة</label><input id="membershipNumber" name="membershipNumber" className="field" required maxLength={80} autoComplete="off" inputMode="text"/></div></div>
        <div className="form-row"><label className="label" htmlFor="specialty">التخصص الهندسي</label><select id="specialty" className="field" value={specialty} onChange={e => setSpecialty(e.target.value)}>{SPECIALTIES.map(s => <option key={s}>{s}</option>)}</select></div>
        <div className="form-row"><label className="label" htmlFor="membershipProof">إثبات العضوية النقابية (إلزامي)</label><input className="field" id="membershipProof" name="membershipProof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required/><span className="tiny muted">PDF أو صورة JPG/PNG/WebP، بحد أقصى 2.5 ميجابايت للملف.</span></div>
        <div className="form-grid"><div className="form-row"><label className="label" htmlFor="experienceProof">إثبات الخبرة (اختياري)</label><input className="field" id="experienceProof" name="experienceProof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"/><span className="tiny muted">لإظهار المستوى المهني.</span></div><div className="form-row"><label className="label" htmlFor="degreeProof">المؤهل الأكاديمي (اختياري)</label><input className="field" id="degreeProof" name="degreeProof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"/></div><div className="form-row"><label className="label" htmlFor="certificateProof">شهادة مهنية (اختياري)</label><input className="field" id="certificateProof" name="certificateProof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"/></div></div>
        <div className="form-row"><label className="label" htmlFor="applicantNote">ملاحظات إضافية (اختياري)</label><textarea className="field" id="applicantNote" value={note} onChange={e => setNote(e.target.value)} maxLength={1000} placeholder="أي معلومات تساعد مسؤول المراجعة"/></div>
        <button className="btn btn-primary" type="submit" disabled={busy}><Upload size={17}/>{busy ? "جارٍ إرسال الطلب…" : "إرسال طلب التوثيق"}</button>
      </form>}
    </section>
    <aside className="card status-card"><h2 className="section-title">ماذا يحدث بعد الإرسال؟</h2><div className="stack"><div className="row"><span className="pill navy">1</span><span>تراجع الإدارة الاسم والعضوية ومستند الإثبات يدويًا.</span></div><div className="row"><span className="pill navy">2</span><span>تراجع المستندات الإضافية قبل اعتماد المستوى والشارات المهنية.</span></div><div className="row"><span className="pill navy">3</span><span>عند الموافقة، يفتح الموجز والملفات والتفاعلات.</span></div></div><hr className="divider"/><h3 className="section-title">خصوصيتك</h3><p className="small muted" style={{ margin: 0 }}>رقم العضوية ومستندات المراجعة لا تظهر لباقي الأعضاء. يحتفظ بها النظام بشكل محدود ويُقيَّد الوصول إليها على المراجعين المخوّلين.</p></aside>
  </div>;
}
