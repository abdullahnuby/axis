"use client";

import { LocalizedContent } from "@/components/LanguageProvider";
import { useCallback, useEffect, useState } from "react";
import { BellRing, BellOff, Smartphone } from "lucide-react";

type PushState = "loading" | "enabled" | "disabled" | "unsupported" | "blocked" | "install-required";

function decodeApplicationServerKey(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const raw = window.atob(padded);
  const bytes = Uint8Array.from(raw, character => character.charCodeAt(0));
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export function PushNotificationsControl() {
  const [status, setStatus] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const loadState = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (isIOS && !standalone) {
      setStatus("install-required");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      setRegistration(reg);
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        const saved = await fetch("/api/push/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription), cache: "no-store" });
        if (saved.ok) setStatus("enabled");
        else setStatus(Notification.permission === "denied" ? "blocked" : "disabled");
      } else {
        setStatus(Notification.permission === "denied" ? "blocked" : "disabled");
      }
    } catch {
      setStatus("unsupported");
    }
  }, []);

  useEffect(() => { void loadState(); }, [loadState]);

  async function toggleNotifications() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (status === "enabled") {
        const reg = registration || await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          const response = await fetch("/api/push/subscription", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "ما قدرناش نوقف إشعارات هذا الجهاز.");
          await subscription.unsubscribe();
        }
        setStatus("disabled");
        setNotice("تم إيقاف إشعارات AXIS على هذا الجهاز.");
        return;
      }
      if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) {
        throw new Error("المتصفح ده مش بيدعم الإشعارات الفورية.");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("blocked");
        throw new Error("لازم تسمح بالإشعارات من إعدادات المتصفح علشان توصلك التنبيهات.");
      }
      const keyResponse = await fetch("/api/push/public-key", { cache: "no-store" });
      const keyData = await keyResponse.json();
      if (!keyResponse.ok || typeof keyData.publicKey !== "string") throw new Error(keyData.error || "خدمة إشعارات الهاتف لسه مش جاهزة.");
      const reg = registration || await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeApplicationServerKey(keyData.publicKey) });
      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      const data = await response.json();
      if (!response.ok) {
        await subscription.unsubscribe().catch(() => undefined);
        throw new Error(data.error || "ما قدرناش نفعّل الإشعارات على هذا الجهاز.");
      }
      setRegistration(reg);
      setStatus("enabled");
      setNotice("الإشعارات اتفعّلت. هيوصلك تنبيه عند اعتماد عضويتك أو وجود نشاط مهم في AXIS.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "حصلت مشكلة وإحنا بنظبط الإشعارات.");
    } finally {
      setBusy(false);
    }
  }

  const title = status === "enabled" ? "إشعارات الهاتف مفعّلة" : "إشعارات الموبايل";
  const description = status === "enabled"
    ? "هنبعتلك تنبيه خارج الموقع لما يحصل تحديث مهم، حتى لو AXIS مش مفتوح."
    : status === "install-required"
      ? "على iPhone، لازم تضيف AXIS للشاشة الرئيسية وتفتحها من الأيقونة أولًا؛ بعدها تقدر تفعّل الإشعارات."
      : status === "unsupported"
        ? "المتصفح ده مش بيدعم الإشعارات الفورية. مركز الإشعارات داخل AXIS هيفضل متاح."
        : status === "blocked"
          ? "الإشعارات مرفوضة من المتصفح. اسمح بها من إعدادات الموقع، ثم جرّب تاني."
          : "فعّلها علشان تعرف بنتيجة التوثيق والرسائل والتفاعلات من غير ما تفضل فاتح الموقع.";
  return <LocalizedContent>{<div className="alert" style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
    <div style={{ paddingTop: 2 }}>{status === "enabled" ? <BellRing size={20}/> : status === "install-required" || status === "unsupported" ? <Smartphone size={20}/> : <BellOff size={20}/>}</div>
    <div style={{ flex: "1 1 220px" }}>
      <strong>{title}</strong>
      <p className="small muted" style={{ margin: "4px 0 0" }}>{description}</p>
      {notice && <p className="small" role="status" style={{ margin: "5px 0 0" }}>{notice}</p>}
      {error && <p className="small" role="alert" style={{ margin: "5px 0 0", color: "var(--danger)" }}>{error}</p>}
    </div>
    {status !== "loading" && status !== "unsupported" && status !== "install-required" && <button type="button" className="btn btn-small" disabled={busy} onClick={() => void toggleNotifications()}>{busy ? "جارٍ الحفظ…" : status === "enabled" ? "إيقاف الإشعارات" : "تفعيل الإشعارات"}</button>}
  </div>}</LocalizedContent>;
}
