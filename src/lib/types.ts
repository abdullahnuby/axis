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
  created_at?: string;
}

export interface FeedPost {
  id: string;
  author_id: string;
  username: string;
  display_name: string;
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
  comments?: FeedComment[];
}

export interface FeedComment {
  id: string;
  post_id: string;
  author_id: string;
  display_name: string;
  username: string;
  seniority_code: SeniorityCode;
  verified_badges: string[];
  body: string;
  created_at: string;
}

export interface EngineeringEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_url: string | null;
  starts_at: string | null;
}
