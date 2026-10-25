"use client";

import { LocalizedContent } from "@/components/LanguageProvider";
import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function MobileCreatePostButton() {
  const pathname = usePathname();
  const router = useRouter();
  function openComposer() {
    if (pathname === "/feed") {
      window.dispatchEvent(new Event("axis-open-composer"));
      return;
    }
    router.push("/feed?compose=1");
  }
  return <LocalizedContent>{<button type="button" className="mobile-compose-link" aria-label="كتابة بوست جديد" onClick={openComposer}><span className="mobile-compose-icon"><Plus size={21}/></span><span>بوست</span></button>}</LocalizedContent>;
}
