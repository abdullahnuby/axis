import type { Metadata } from "next";
import { requireVerifiedPage } from "@/lib/auth";
import { FeedClient } from "@/components/FeedClient";
export const metadata: Metadata = { title: "آخر المشاركات" };
export const dynamic = "force-dynamic";
export default async function FeedPage() { const user = await requireVerifiedPage(); return <FeedClient user={user}/>; }
