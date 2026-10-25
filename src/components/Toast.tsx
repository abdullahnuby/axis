"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { LocalizedContent } from "@/components/LanguageProvider";

/** Non-blocking, auto-dismiss feedback that never shifts the page layout. */
export function Toast({ message, error = false }: { message?: string; error?: boolean }) {
  const [visible, setVisible] = useState(Boolean(message));
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;
    const timeout = window.setTimeout(() => setVisible(false), error ? 6500 : 4200);
    return () => window.clearTimeout(timeout);
  }, [message, error]);

  if (!mounted || !message || !visible) return null;
  return createPortal((
    <LocalizedContent><div className={`axis-toast ${error ? "axis-toast-error" : "axis-toast-success"}`} role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"}>
      {error ? <CircleAlert size={19} aria-hidden="true"/> : <CheckCircle2 size={19} aria-hidden="true"/>}
      <span>{message}</span>
      <button type="button" className="axis-toast-close" onClick={() => setVisible(false)} aria-label="إغلاق الرسالة"><X size={16}/></button>
    </div></LocalizedContent>
  ), document.body);
}
