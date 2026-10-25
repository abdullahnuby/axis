import type { Metadata } from "next";
import { requireVerifiedPage } from "@/lib/auth";
import { ConversationClient } from "@/components/MessagesClient";
export const metadata:Metadata={title:"محادثة"};export const dynamic="force-dynamic";
export default async function ConversationPage({params}:{params:Promise<{conversationId:string}>}){const user=await requireVerifiedPage();const{conversationId}=await params;return <ConversationClient user={user} conversationId={conversationId}/>;}
