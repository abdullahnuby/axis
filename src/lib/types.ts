export type VerificationStatus = "unverified" | "pending" | "needs_info" | "rejected" | "verified";
export type UserRole = "member" | "admin" | "reviewer" | "moderator";
export type SeniorityCode = "JNR" | "MID" | "SNR" | "EXP";

export interface SessionUser {
  [key: string]: any;
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: UserRole;
  verification_status: VerificationStatus;
  account_status: "active" | "suspended";
  specialty: string | null;
  bio: string | null;
  job_title: string | null;
  approved_years: string | number | null;
  seniority_code: SeniorityCode;
  verified_badges: string[];
  avatar_color: string;
  has_avatar?: boolean;
  has_cover?: boolean;
  updated_at?: string;
  created_at?: string;
  email_verified_at?: string | null;
}

export interface FeedPost {
  id: string;
  author_id: string;
  username: string;
  display_name: string;
  author_role?: UserRole;
  avatar_color?: string;
  has_avatar?: boolean;
  seniority_code: SeniorityCode;
  job_title: string | null;
  specialty: string | null;
  verified_badges: string[];
  body: string;
  has_image: boolean;
  image_mime: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  has_liked: boolean;
  shared_post_id: string | null;
  group_id?: string | null;
  pinned_at?: string | null;
  shared_body?: string | null;
  shared_created_at?: string | null;
  shared_has_image?: boolean | null;
  shared_image_mime?: string | null;
  shared_username?: string | null;
  shared_display_name?: string | null;
  shared_author_role?: UserRole;
  shared_avatar_color?: string | null;
  shared_author_id?: string | null;
  shared_has_avatar?: boolean;
  shared_seniority_code?: SeniorityCode;
  shared_job_title?: string | null;
  shared_specialty?: string | null;
  shared_verified_badges?: string[];
  comments?: FeedComment[];
}

export interface FeedComment {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  display_name: string;
  username: string;
  author_role?: UserRole;
  avatar_color?: string;
  has_avatar?: boolean;
  seniority_code: SeniorityCode;
  verified_badges: string[];
  body: string;
  created_at: string;
  edited_at?: string | null;
  like_count: number;
  has_liked: boolean;
}

export interface EngineeringEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_url: string | null;
  starts_at: string | null;
}
