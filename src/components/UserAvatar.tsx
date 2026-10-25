"use client";

import { LocalizedContent } from "@/components/LanguageProvider";
type UserAvatarProps = {
  userId?: string | null;
  displayName: string;
  avatarColor?: string | null;
  hasAvatar?: boolean | null;
  className?: string;
  version?: string | number | null;
};

/** Consistent avatar with a safe initials fallback if no photo exists or loading fails. */
export function UserAvatar({ userId, displayName, avatarColor, hasAvatar, className = "", version }: UserAvatarProps) {
  const source = hasAvatar && userId
    ? `/api/people/${encodeURIComponent(userId)}/media?kind=avatar${version != null ? `&v=${encodeURIComponent(String(version))}` : ""}`
    : null;
  return <LocalizedContent>{(
    <span className={`avatar axis-user-avatar ${className}`} data-user-content={true} style={{ background: avatarColor || "var(--blue)" }} aria-label={displayName} title={displayName}>
      <span className="axis-avatar-fallback" aria-hidden="true">{displayName.trim().slice(0, 1) || "م"}</span>
      {source ? <img src={source} alt="" loading="lazy" decoding="async" onError={event => { event.currentTarget.style.display = "none"; }} /> : null}
    </span>
)}</LocalizedContent>;
}
