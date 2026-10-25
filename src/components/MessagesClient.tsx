"use client";
import { useCallback,useEffect,useState, type FormEvent } from "react";
import Link from "next/link";
import { MessageCircle, Search, Send, UserRound, ArrowRight, PencilLine, Trash2, Check, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Toast } from "@/components/Toast";
import type { SessionUser } from "@/lib/types";
type Conversation={id:string;other_user_id:string;other_username:string;other_display_name:string;other_avatar_color:string;other_specialty:string|null;last_message:string|null;last_message_at:string|null;last_sender_id:string|null;unread_count:number};
type Message={id:string;sender_id:string;body:string;created_at:string;edited_at?:string|null;display_name:string;username:string;avatar_color:string};
export function MessagesClient({user}:{user:SessionUser}){const[items,setItems]=useState<Conversation[]>([]);const[q,setQ]=useState('');const[results,setResults]=useState<Array<{id:string;username:string;display_name:string;specialty:string|null;avatar_color:string}>>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');const[busyId,setBusyId]=useState<string|null>(null);
const load=useCallback(async()=>{try{const r=await fetch('/api/conversations',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'مش قادرين نحمّل رسايلك.');setItems(d.conversations||[]);}catch(e){setError(e instanceof Error?e.message:'حصلت مشكلة.');}finally{setLoading(false);}},[]);useEffect(()=>{void load();},[load]);
useEffect(()=>{let active=true;const t=setTimeout(async()=>{if(!q.trim()){setResults([]);return;}try{const r=await fetch(`/api/people?q=${encodeURIComponent(q)}&limit=8`,{cache:'no-store'});const d=await r.json();if(active&&r.ok)setResults(d.people||[]);}catch{}},250);return()=>{active=false;clearTimeout(t);};},[q]);
async function start(userId:string){setBusyId(userId);try{const r=await fetch('/api/conversations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId})});const d=await r.json();if(!r.ok)throw new Error(d.error||'ما قدرناش نبدأ المحادثة.');window.location.href=d.redirect;}catch(e){setError(e instanceof Error?e.message:'حصلت مشكلة.');setBusyId(null);}}
return <AppShell user={user} active="/messages"><header className="page-heading-line"><div><h1 className="page-title">الرسائل</h1><p className="muted">اتكلم مع زملائك على انفراد، وكمّل النقاش بعيدًا عن المنشورات.</p></div><MessageCircle size={23} className="muted"/></header><label className="people-search-field messages-search"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="ابدأ محادثة مع مهندس…"/></label><Toast message={error} error/>{results.length>0&&<section className="card message-people-results"><h2 className="section-title">مهندسين تقدر تراسلهم</h2>{results.map(p=><div className="conversation-row" key={p.id}><div className="avatar sm" style={{background:p.avatar_color}}>{p.display_name.slice(0,1)}</div><div className="conversation-copy"><strong>{p.display_name}</strong><span className="tiny muted">{p.specialty||'عضو AXIS'}</span></div><button className="btn btn-small btn-primary" disabled={busyId===p.id} onClick={()=>void start(p.id)}>رسالة</button></div>)}</section>}{loading?<div className="card people-empty">بنحمّل محادثاتك…</div>:items.length?<section className="conversation-list">{items.map(c=><Link href={`/messages/${c.id}`} className="card conversation-row" key={c.id}><div className="avatar" style={{background:c.other_avatar_color}}>{c.other_display_name.slice(0,1)}</div><div className="conversation-copy"><strong>{c.other_display_name}</strong><span className="small muted">{c.last_sender_id===user.id?'إنت: ':''}{c.last_message||'ابدأوا الكلام برسالة جديدة.'}</span></div><div className="conversation-row-meta">{c.last_message_at&&<time className="tiny muted">{new Date(c.last_message_at).toLocaleDateString('ar-EG')}</time>}{Number(c.unread_count)>0&&<span className="conversation-unread">{Number(c.unread_count)}</span>}</div></Link>)}</section>:<div className="card people-empty"><MessageCircle size={25}/><h2>لسه مفيش محادثات</h2><p>دوّر على مهندس فوق وابدأ أول محادثة.</p><Link href="/people" className="btn btn-primary"><UserRound size={16}/> اكتشف المهندسين <ArrowRight size={15}/></Link></div>}</AppShell>}
export function ConversationClient({user,conversationId}:{user:SessionUser;conversationId:string}) {
  const [peer,setPeer]=useState<{other_user_id:string;other_display_name:string;other_username:string;other_avatar_color:string}|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [body,setBody]=useState("");
  const [editingMessageId,setEditingMessageId]=useState<string|null>(null);
  const [editMessageBody,setEditMessageBody]=useState("");
  const [busyMessageId,setBusyMessageId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  const load=useCallback(async()=>{
    try {
      const r=await fetch(`/api/conversations/${conversationId}/messages`,{cache:"no-store"});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"المحادثة مش متاحة.");
      setPeer(d.conversation);
      setMessages(d.messages||[]);
      setError("");
    } catch(e) {
      setError(e instanceof Error?e.message:"حصلت مشكلة في تحميل الرسائل.");
    } finally { setLoading(false); }
  },[conversationId]);
  useEffect(()=>{void load();const id=window.setInterval(()=>void load(),12000);return()=>window.clearInterval(id);},[load]);

  async function send(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text=body.trim();
    if(!text||busy)return;
    setBusy(true);setError("");setSuccess("");
    try {
      const r=await fetch(`/api/conversations/${conversationId}/messages`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:text})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"الرسالة ما اتبعتش.");
      setMessages(old=>[...old,d.message]);setBody("");
    } catch(e) { setError(e instanceof Error?e.message:"الرسالة ما اتبعتش."); }
    finally { setBusy(false); }
  }

  function beginEdit(message:Message) {
    setEditingMessageId(message.id);setEditMessageBody(message.body);setError("");setSuccess("");
  }
  async function saveEdit(event:FormEvent<HTMLFormElement>,message:Message) {
    event.preventDefault();
    const next=editMessageBody.trim();
    if(!next||busyMessageId)return;
    setBusyMessageId(message.id);setError("");setSuccess("");
    try {
      const r=await fetch(`/api/conversations/${conversationId}/messages/${message.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:next})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"ما قدرناش نحفظ تعديل الرسالة.");
      setMessages(old=>old.map(item=>item.id===message.id?{...item,body:d.message.body,edited_at:d.message.edited_at}:item));
      setEditingMessageId(null);setEditMessageBody("");setSuccess("اتحفظ تعديل الرسالة.");
    } catch(e) { setError(e instanceof Error?e.message:"ما قدرناش نحفظ تعديل الرسالة."); }
    finally { setBusyMessageId(null); }
  }
  async function deleteMessage(message:Message) {
    if(busyMessageId||!window.confirm("تحب تحذف الرسالة دي من المحادثة؟"))return;
    setBusyMessageId(message.id);setError("");setSuccess("");
    try {
      const r=await fetch(`/api/conversations/${conversationId}/messages/${message.id}`,{method:"DELETE"});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"ما قدرناش نحذف الرسالة.");
      setMessages(old=>old.filter(item=>item.id!==message.id));
      if(editingMessageId===message.id){setEditingMessageId(null);setEditMessageBody("");}
      setSuccess("اتحذفت الرسالة من المحادثة.");
    } catch(e) { setError(e instanceof Error?e.message:"ما قدرناش نحذف الرسالة."); }
    finally { setBusyMessageId(null); }
  }

  return <AppShell user={user} active="/messages"><div className="conversation-page">
    <div className="conversation-title-row"><Link href="/messages" className="icon-btn" aria-label="العودة للرسائل"><ArrowRight size={18}/></Link>{peer&&<><div className="avatar" style={{background:peer.other_avatar_color}}>{peer.other_display_name.slice(0,1)}</div><div className="conversation-copy"><Link href={`/people/${peer.other_username}`}><strong>{peer.other_display_name}</strong></Link><span className="tiny muted">محادثة خاصة داخل AXIS</span></div></>}</div>
    <Toast message={error} error/><Toast message={success}/>
    <div className="conversation-messages" aria-live="polite">{loading?<div className="people-empty">بنحمّل الرسائل…</div>:messages.length?messages.map(m=><div className={`message-bubble-row ${m.sender_id===user.id?"message-own":""}`} key={m.id}><div className="message-bubble">
      {editingMessageId===m.id?<form className="message-edit-form" onSubmit={event=>void saveEdit(event,m)}><label className="sr-only" htmlFor={`message-edit-${m.id}`}>تعديل الرسالة</label><textarea id={`message-edit-${m.id}`} className="field" rows={3} maxLength={5000} value={editMessageBody} onChange={event=>setEditMessageBody(event.target.value)}/><div className="row"><button className="btn btn-primary btn-small" type="submit" disabled={busyMessageId===m.id||!editMessageBody.trim()}><Check size={14}/>{busyMessageId===m.id?"جارٍ الحفظ…":"حفظ"}</button><button className="btn btn-small" type="button" disabled={busyMessageId===m.id} onClick={()=>{setEditingMessageId(null);setEditMessageBody("");}}><X size={14}/>إلغاء</button></div></form>:<><p>{m.body}</p>{m.edited_at&&<span className="message-edited-label">تم التعديل</span>}</>}
      <div className="message-bubble-footer"><time>{new Date(m.created_at).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}</time>{m.sender_id===user.id&&editingMessageId!==m.id&&<div className="message-actions"><button type="button" aria-label="تعديل الرسالة" title="تعديل الرسالة" onClick={()=>beginEdit(m)} disabled={Boolean(busyMessageId)}><PencilLine size={13}/></button><button type="button" aria-label="حذف الرسالة" title="حذف الرسالة" onClick={()=>void deleteMessage(m)} disabled={busyMessageId===m.id}><Trash2 size={13}/></button></div>}</div>
    </div></div>):<div className="people-empty"><MessageCircle size={23}/><p>ابدأوا الكلام. الرسائل هنا بينك وبين زميلك بس.</p></div>}</div>
    <form className="message-compose" onSubmit={send}><textarea className="field" value={body} onChange={e=>setBody(e.target.value)} maxLength={5000} rows={1} placeholder="اكتب رسالة…" aria-label="نص الرسالة"/><button className="btn btn-primary" disabled={busy||!body.trim()} aria-label="إرسال الرسالة"><Send size={17}/></button></form>
  </div></AppShell>;
}
