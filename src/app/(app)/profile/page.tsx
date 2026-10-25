import type { Metadata } from "next";
import { requireVerifiedPage } from "@/lib/auth";
import { query } from "@/lib/db";
import { ProfileClient, type ProfilePostPreview } from "@/components/ProfileClient";
export const metadata: Metadata = { title: "ملفي المهني" };
export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  const user = await requireVerifiedPage();
  const posts = await query<ProfilePostPreview>(`SELECT p.id, p.body, p.specialty, p.created_at, p.shared_post_id, p.group_id, p.pinned_at,
      (p.image_data IS NOT NULL) AS has_image,
      sp.body AS shared_body, sp.created_at AS shared_created_at,
      (sp.image_data IS NOT NULL) AS shared_has_image,
      sp.author_id AS shared_author_id, sp.author_id AS shared_author_id, su.display_name AS shared_display_name, su.avatar_color AS shared_avatar_color,
      (su.avatar_image_mime IS NOT NULL) AS shared_has_avatar,
      (su.avatar_image_mime IS NOT NULL) AS shared_has_avatar,
      su.specialty AS shared_profile_specialty, sp.specialty AS shared_specialty,
      (SELECT count(*)::int FROM post_likes l WHERE l.post_id=p.id) AS like_count,
      (SELECT count(*)::int FROM comments c WHERE c.post_id=p.id) AS comment_count
    FROM posts p
    LEFT JOIN posts sp ON sp.id=p.shared_post_id
    LEFT JOIN users su ON su.id=sp.author_id
    WHERE p.author_id=$1 ORDER BY (p.group_id IS NULL AND p.pinned_at IS NOT NULL) DESC,p.created_at DESC LIMIT 12`, [user.id]);
  return <ProfileClient initialUser={user} initialPosts={posts.rows.map(post => ({ ...post, created_at: String(post.created_at) }))}/>;
}
