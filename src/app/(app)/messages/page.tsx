import type { Metadata } from "next";
import { requireVerifiedPage } from "@/lib/auth";
import { MessagesClient } from "@/components/MessagesClient";
export const metadata:Metadata={title:"الرسائل"};export const dynamic="force-dynamic";
export default async function MessagesPage(){const user=await requireVerifiedPage();return <MessagesClient user={user}/>;}
