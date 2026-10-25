import type { Metadata } from "next";
import { requireVerifiedPage } from "@/lib/auth";
import { GroupDetailClient } from "@/components/GroupDetailClient";
export const metadata:Metadata={title:"مجموعة هندسية"};export const dynamic="force-dynamic";
export default async function GroupPage({params}:{params:Promise<{groupId:string}>}){const user=await requireVerifiedPage();const{groupId}=await params;return <GroupDetailClient user={user} groupId={groupId}/>;}
