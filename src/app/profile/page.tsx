import type { Metadata } from "next";
import { requireVerifiedPage } from "@/lib/auth";
import { query } from "@/lib/db";
import { ProfileClient, type ProfilePostPreview } from "@/components/ProfileClient";
export const metadata: Metadata = { title: "ملفي المهني" };
export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  const user = await requireVerifiedPage();
  const posts = await query<ProfilePostPreview>(`SELECT p.id, p.body, p.specialty, p.created_at,
      (p.image_data IS NOT NULL) AS has_image,
      (SELECT count(*)::int FROM post_likes l WHERE l.post_id=p.id) AS like_count,
      (SELECT count(*)::int FROM comments c WHERE c.post_id=p.id) AS comment_count
    FROM posts p WHERE p.author_id=$1 ORDER BY p.created_at DESC LIMIT 12`, [user.id]);
  return <ProfileClient initialUser={user} initialPosts={posts.rows.map(post => ({ ...post, created_at: String(post.created_at) }))}/>;
}
