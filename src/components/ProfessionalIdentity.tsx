import type { SessionUser } from "@/lib/types";

const titles: Record<string, string> = {
  JNR: "Junior Engineer",
  MID: "Mid-Level Engineer",
  SNR: "Senior Engineer",
  EXP: "Expert",
};

export function ProfessionalBadges({ level, badges = [], compact = false }: { level?: string | null; badges?: string[]; compact?: boolean }) {
  const list = [...(level ? [level] : []), ...badges].slice(0, compact ? 3 : 8);
  if (!list.length) return null;
  return <span className="badges">{list.map((badge) => <span key={badge} title={titles[badge] || badge} className={`pill ${["SNR", "EXP", "PMP", "PhD", "MSc", "PM"].includes(badge) ? "gold" : ""}`}>{badge}</span>)}</span>;
}

export function UserIdentity({ user, small = false }: { user: Pick<SessionUser, "display_name" | "username" | "seniority_code" | "job_title" | "specialty" | "verified_badges" | "avatar_color">; small?: boolean }) {
  const initial = (user.display_name || user.username || "م").trim().slice(0, 1);
  return (
    <div className="user-line">
      <div className={`avatar ${small ? "sm" : ""}`} style={{ background: user.avatar_color || "#007BFF" }}>{initial}</div>
      <div className="user-meta">
        <div className="user-name"><span>{user.display_name}</span><ProfessionalBadges level={user.seniority_code} badges={user.verified_badges} compact /></div>
        {!small && <div className="user-sub">{user.job_title || `مهندس ${user.specialty || ""}`}{user.specialty && user.job_title ? ` · ${user.specialty}` : ""}</div>}
        {small && <div className="user-sub">@{user.username}</div>}
      </div>
    </div>
  );
}
