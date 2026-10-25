'use client';

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { getLocalizedText, type Locale } from "@/lib/i18n";

export type UiPreferences = {
  compactMode: boolean;
  reduceMotion: boolean;
};

const DEFAULT_PREFERENCES: UiPreferences = {
  compactMode: false,
  reduceMotion: false,
};

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  preferences: UiPreferences;
  setPreferences: (preferences: UiPreferences) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const USER_CONTENT_CLASS_NAMES = new Set([
  "post-body",
  "message-text",
  "message-content",
  "user-generated-content",
  "no-translate",
]);

function hasUserContentBoundary(props: Record<string, unknown>) {
  if (
    props["data-user-content"] === true ||
    props["data-user-content"] === "true" ||
    props["data-no-translate"] === true ||
    props["data-no-translate"] === "true"
  ) return true;
  const className = typeof props.className === "string" ? props.className : "";
  return className.split(/\s+/).some((name) => USER_CONTENT_CLASS_NAMES.has(name));
}

function localizeNode(node: ReactNode, locale: Locale, insideUserContent = false): ReactNode {
  if (node === null || node === undefined || typeof node === "boolean" || typeof node === "number") {
    return node;
  }

  if (typeof node === "string") {
    return insideUserContent ? node : getLocalizedText(node, locale);
  }

  if (Array.isArray(node)) {
    return node.map((child) => localizeNode(child, locale, insideUserContent));
  }

  if (!isValidElement(node)) return node;

  const props = node.props as Record<string, unknown>;
  if (insideUserContent || hasUserContentBoundary(props)) return node;

  const nextProps: Record<string, unknown> = {};
  for (const attribute of ["placeholder", "title", "aria-label", "aria-description", "alt"]) {
    const value = props[attribute];
    if (typeof value === "string") {
      nextProps[attribute] = getLocalizedText(value, locale);
    }
  }

  if (props.children !== undefined) {
    nextProps.children = Children.map(props.children as ReactNode, (child) => localizeNode(child, locale));
  }

  return cloneElement(node, nextProps);
}

function normalizePreferences(value: unknown): UiPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_PREFERENCES;
  const input = value as Record<string, unknown>;
  return {
    compactMode: input.compactMode === true,
    reduceMotion: input.reduceMotion === true,
  };
}

export function LocalizedContent({ children }: Readonly<{ children: ReactNode }>) {
  const language = useLanguage();
  return <>{localizeNode(children, language.locale)}</>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}

export function LanguageProvider({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const originalMetadata = useRef(new Map<string, { title: string; description: string }>());
  const [localeState, setLocaleState] = useState<Locale>("ar");
  const [preferencesState, setPreferencesState] = useState<UiPreferences>(DEFAULT_PREFERENCES);
  const localeTouched = useRef(false);
  const preferencesTouched = useRef(false);

  const setLocale = useCallback((nextLocale: Locale) => {
    localeTouched.current = true;
    setLocaleState(nextLocale);
  }, []);

  const setPreferences = useCallback((nextPreferences: UiPreferences) => {
    preferencesTouched.current = true;
    setPreferencesState(normalizePreferences(nextPreferences));
  }, []);

  useEffect(() => {
    let active = true;

    try {
      const savedLocale = window.localStorage.getItem("axis-locale");
      if (!localeTouched.current && (savedLocale === "ar" || savedLocale === "en")) {
        setLocaleState(savedLocale);
      }
      const savedPreferences = window.localStorage.getItem("axis-ui-preferences");
      if (savedPreferences && !preferencesTouched.current) {
        setPreferencesState(normalizePreferences(JSON.parse(savedPreferences)));
      }
    } catch {
      // Browser storage may be disabled; the account settings endpoint is still attempted below.
    }

    // The account value wins over this device's cached value, unless the user has already changed it.
    void fetch("/api/me/preferences", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload: { locale?: unknown; preferences?: unknown } | null) => {
        if (!active || !payload) return;
        if (payload.locale === "ar" || payload.locale === "en") {
          setLocaleState(payload.locale);
        }
        if (payload.preferences) {
          setPreferencesState(normalizePreferences(payload.preferences));
        }
      })
      .catch(() => {
        // Public pages and signed-out users keep their local defaults without an error screen.
      });

    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    document.documentElement.lang = localeState;
    document.documentElement.dir = localeState === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.locale = localeState;
    try {
      window.localStorage.setItem("axis-locale", localeState);
    } catch {
      // Language still works for the current visit if storage is restricted.
    }
  }, [localeState]);


  useEffect(() => {
    const pageKey = pathname || "/";
    const descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    let original = originalMetadata.current.get(pageKey);

    if (!original) {
      original = {
        title: document.title,
        description: descriptionMeta?.content ?? "",
      };
      originalMetadata.current.set(pageKey, original);
    }

    if (localeState === "en") {
      document.title = getLocalizedText(original.title, localeState);
      if (descriptionMeta && original.description) {
        descriptionMeta.content = getLocalizedText(original.description, localeState);
      }
    } else {
      document.title = original.title;
      if (descriptionMeta && original.description) {
        descriptionMeta.content = original.description;
      }
    }
  }, [localeState, pathname]);

  useEffect(() => {
    document.documentElement.dataset.density = preferencesState.compactMode ? "compact" : "comfortable";
    document.documentElement.dataset.reduceMotion = preferencesState.reduceMotion ? "true" : "false";
    try {
      window.localStorage.setItem("axis-ui-preferences", JSON.stringify(preferencesState));
    } catch {
      // Display options remain active in memory if browser storage is restricted.
    }
  }, [preferencesState]);

  const contextValue = useMemo<LanguageContextValue>(() => ({
    locale: localeState,
    setLocale,
    preferences: preferencesState,
    setPreferences,
  }), [localeState, setLocale, preferencesState, setPreferences]);

  return (
    <LanguageContext.Provider value={contextValue}>
      <LocalizedContent>{children}</LocalizedContent>
    </LanguageContext.Provider>
  );
}
