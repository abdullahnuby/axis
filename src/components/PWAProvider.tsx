"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PWAContextValue = {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isSafari: boolean;
  install: () => Promise<boolean>;
};

const PWAContext = createContext<PWAContextValue>({
  canInstall: false,
  isInstalled: false,
  isIOS: false,
  isSafari: false,
  install: async () => false,
});

export function PWAProvider({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    const safari = /Safari/i.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS|Brave|DuckDuckGo|GSA|YaBrowser)/i.test(ua);
    setIsIOS(ios);
    setIsSafari(safari);
    setIsInstalled(standalone);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    if ("serviceWorker" in navigator && (window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
        console.warn("AXIS service worker registration failed", error);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return false;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setIsInstalled(true);
      setPromptEvent(null);
      return choice.outcome === "accepted";
    } catch {
      setPromptEvent(null);
      return false;
    }
  }, [promptEvent]);

  const value = useMemo(() => ({ canInstall: Boolean(promptEvent), isInstalled, isIOS, isSafari, install }), [promptEvent, isInstalled, isIOS, isSafari, install]);
  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}

export function usePWAInstall() {
  return useContext(PWAContext);
}
