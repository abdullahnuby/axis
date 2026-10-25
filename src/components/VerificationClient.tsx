"use client";
import { useState, type FormEvent } from "react";
import { ShieldCheck, Upload, Clock3, FileCheck2, MailCheck } from "lucide-react";
import { Toast } from "@/components/Toast";
import { SPECIALTIES } from "@/lib/constants";
import { PushNotificationsControl } from "@/components/PushNotificationsControl";

export function VerificationClient({ initialStatus, reviewNote, legalName, submittedAt }: { initialStatus: string; reviewNote?: string | null; legalName?: string | null; submittedAt?: string | null }) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");
  const [emailError, setEmailError] = useState("");
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
      if (!response.ok) throw new Error(data.error || "ما قدرناش نبعت الطلب دلوقتي. جرّب تاني.");
      setStatus("pending"); setSuccess("طلبك وصل! فريق AXIS هيراجع بيانات العضوية، والمشاركات هتظهرلك بعد اعتمادها.");
    } catch (e) { setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع."); }
    finally { setBusy(false); }
  }
  return <div className="status-layout">
    <section className="card status-card">
      <div className="verification-heading-row">
        <div className="verification-heading-icon"><ShieldCheck size={24}/><span/></div>
        <div className="verification-heading-copy"><div className="verification-eyebrow">AXIS / MEMBERSHIP REVIEW</div><h1 className="section-title">خلّينا نتأكد إنك من أهل المجال.</h1><p>دي مراجعة بسيطة لبيانات العضوية النقابية علشان مجتمع AXIS يفضل مخصص للمهندسين.</p></div>
        <span className={`verification-current-status ${status === "pending" ? "pending" : status === "rejected" || status === "needs_info" ? "attention" : status === "verified" ? "approved" : "new"}`}>{status === "pending" ? "قيد المراجعة" : status === "needs_info" ? "مطلوب استكمال" : status === "rejected" ? "محتاج إعادة تقديم" : status === "verified" ? "تم الاعتماد" : "خطوة 01"}</span>
      </div>
      <div className={`verification-journey ${status === "pending" ? "journey-pending" : status === "needs_info" || status === "rejected" ? "journey-attention" : status === "verified" ? "journey-approved" : "journey-start"}`}>
        <div className="verification-journey-head"><span>مسار الانضمام</span><span>MEMBERSHIP / 3 STEPS</span></div>
        <div className="verification-journey-steps">
          <div className={`verification-journey-step ${status === "unverified" ? "current" : "complete"}`}>
            <span className="verification-step-icon">{status === "unverified" ? <Upload size={16}/> : <FileCheck2 size={16}/>}</span>
            <div><strong>بيانات العضوية</strong><small>{status === "unverified" ? "استكمال البيانات المطلوبة" : "تم استلام البيانات"}</small></div>
          </div>
          <span className="verification-step-connector"/>
          <div className={`verification-journey-step ${status === "pending" ? "current" : status === "needs_info" || status === "rejected" ? "attention" : status === "verified" ? "complete" : "upcoming"}`}>
            <span className="verification-step-icon"><Clock3 size={16}/></span>
            <div><strong>مراجعة العضوية</strong><small>{status === "pending" ? "فريق AXIS بيراجع الطلب" : status === "needs_info" ? "في معلومات محتاجة استكمال" : status === "rejected" ? "راجع الملاحظة وقدّم الطلب تاني" : status === "verified" ? "اكتملت المراجعة" : "بعد إرسال الطلب"}</small></div>
          </div>
          <span className="verification-step-connector"/>
          <div className={`verification-journey-step ${status === "verified" ? "complete" : "upcoming"}`}>
            <span className="verification-step-icon"><ShieldCheck size={16}/></span>
            <div><strong>الدخول للمجتمع</strong><small>{status === "verified" ? "تقدر تدخل وتشارك" : "بعد اعتماد العضوية"}</small></div>
          </div>
        </div>
      </div>
      <div className="alert">المجتمع هيفتحلك بعد المراجعة. بنعمل كده علشان ما يبقاش مفتوح لأي حساب، لكن ده مش معناه إن الأعضاء مجهولين أو إن كل شخص بعيد عن الشركات والإدارة.</div>
      <Toast message={error} error/><Toast message={success}/>
      <div className="alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div><strong>تأكيد البريد الإلكتروني</strong><p className="small" style={{ margin: "3px 0 0" }}>هنبعتلك رابط على بريدك لو خدمة البريد مفعّلة في AXIS.</p>{emailStatus && <p className="small" role="status" style={{ margin: "4px 0 0" }}>{emailStatus}</p>}{emailError && <p className="small" role="alert" style={{ margin: "4px 0 0", color: "var(--danger)" }}>{emailError}</p>}</div>
        <button className="btn btn-small" type="button" disabled={emailBusy} onClick={async () => { setEmailBusy(true); setEmailStatus(""); setEmailError(""); try { const r = await fetch("/api/auth/resend-verification", { method: "POST" }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "ما قدرناش نبعت رسالة التأكيد."); setEmailStatus(d.message || "راجع بريدك الإلكتروني."); } catch (e) { setEmailError(e instanceof Error ? e.message : "حصلت مشكلة."); } finally { setEmailBusy(false); } }}><MailCheck size={15}/>{emailBusy ? "جارٍ الإرسال…" : "إرسال رابط التأكيد"}</button>
      </div>
      <PushNotificationsControl/>
      {status === "verified" ? <div className="alert success"><FileCheck2 size={18} style={{ verticalAlign: "middle", marginLeft: 7 }}/> تم اعتماد عضويتك! تقدر دلوقتي تدخل AXIS وتشوف المشاركات وتشارك زملاءك.</div> : status === "pending" ? <div className="stack"><span className="status-pill"><Clock3 size={15}/> طلبك عندنا للمراجعة</span><p style={{ margin: 0 }}>تم إرسال الطلب للمراجعة {submittedAt ? `في ${new Date(submittedAt).toLocaleDateString("ar-EG-u-nu-latn")}` : ""}. ستتغير حالة الحساب بعد قرار الإدارة.</p><p className="small muted" style={{ margin: 0 }}>لو فيه معلومة ناقصة، هنوضح لك إيه المطلوب استكماله هنا.</p></div> : <form className="form-stack" onSubmit={submit}>
        {status === "rejected" && <div className="alert error">المستندات اللي اتبعتت محتاجة تتراجع. تقدر تبعت الطلب تاني بمستندات أوضح. {reviewNote ? `ملاحظة الإدارة: ${reviewNote}` : ""}</div>}
        {status === "needs_info" && <div className="alert">محتاجين منك تكمل شوية معلومات. {reviewNote || "أرسل البيانات المطلوبة مرة أخرى."}</div>}
        <div className="form-grid"><div className="form-row"><label className="label" htmlFor="legalName">الاسم الحقيقي كما هو مسجل لدى النقابة</label><input id="legalName" name="legalName" className="field" value={legal} onChange={e => setLegal(e.target.value)} required maxLength={120}/></div><div className="form-row"><label className="label" htmlFor="membershipNumber">رقم عضوية النقابة</label><input id="membershipNumber" name="membershipNumber" className="field" required maxLength={80} autoComplete="off" inputMode="text"/></div></div>
        <div className="form-row"><label className="label" htmlFor="specialty">المجال اللي مهتم بيه</label><select id="specialty" className="field" value={specialty} onChange={e => setSpecialty(e.target.value)}>{SPECIALTIES.map(s => <option key={s}>{s}</option>)}</select></div>
        <div className="form-row"><label className="label" htmlFor="membershipProof">صورة كارنيه النقابة (اختياري)</label><input className="field" id="membershipProof" name="membershipProof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"/><span className="tiny muted">رفع الصورة اختياري؛ تقدر تبعت طلبك برقم النقابة فقط. لو رفعتها، هتساعد فريق المراجعة. الحد الأقصى 2.5 ميجابايت.</span></div>
        <div className="form-grid"><div className="form-row"><label className="label" htmlFor="experienceProof">إثبات خبرة (اختياري)</label><input className="field" id="experienceProof" name="experienceProof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"/><span className="tiny muted">لو حابب تضيف معلومة تساعد في مراجعة حسابك.</span></div><div className="form-row"><label className="label" htmlFor="degreeProof">مستند مؤهل (اختياري)</label><input className="field" id="degreeProof" name="degreeProof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"/></div><div className="form-row"><label className="label" htmlFor="certificateProof">شهادة أو مستند إضافي (اختياري)</label><input className="field" id="certificateProof" name="certificateProof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"/></div></div>
        <div className="form-row"><label className="label" htmlFor="applicantNote">ملاحظات إضافية (اختياري)</label><textarea className="field" id="applicantNote" value={note} onChange={e => setNote(e.target.value)} maxLength={1000} placeholder="لو فيه حاجة تحب توضّحها لفريق المراجعة، اكتبها هنا"/></div>
        <button className="btn btn-primary" type="submit" disabled={busy}><Upload size={17}/>{busy ? "جارٍ إرسال الطلب…" : "إرسال الطلب للمراجعة"}</button>
      </form>}
    </section>
    <aside className="card status-card"><h2 className="section-title">إيه اللي هيحصل بعد ما تبعت الطلب؟</h2><div className="stack"><div className="row"><span className="pill navy">1</span><span>فريق AXIS هيراجع اسمك ورقم العضوية، وأي مستندات إضافية ترفقها.</span></div><div className="row"><span className="pill navy">2</span><span>لو بعتّ شهادات أو إثبات خبرة، هنراجعها قبل ما تظهر شاراتك المهنية.</span></div><div className="row"><span className="pill navy">3</span><span>أول ما عضويتك تتعتمد، هتقدر تتصفح المشاركات وتعلّق وتتفاعل مع زملاءك.</span></div></div><hr className="divider"/><h3 className="section-title">إيه اللي بيظهر للناس؟</h3><p className="small muted" style={{ margin: 0 }}>رقم العضوية ومستندات المراجعة مش ظاهرة لباقي الأعضاء. بعد قبولك، البوستات والتعليقات بتظهر باسم حسابك؛ فبلاش تشارك أسرار شغل أو معلومات حساسة.</p></aside>
  </div>;
}
