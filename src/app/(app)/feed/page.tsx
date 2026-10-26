import type { Metadata } from "next";
import { requireActivePage } from "@/lib/auth";
import { FeedClient } from "@/components/FeedClient";
export const metadata: Metadata = { title: { absolute: "AXIS" } };
export const dynamic = "force-dynamic";
export default async function FeedPage() { const user = await requireActivePage(); return <FeedClient user={user}/>; }
