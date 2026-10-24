import type { Metadata } from "next";
import { requireVerifiedPage } from "@/lib/auth";
import { GroupsClient } from "@/components/GroupsClient";
export const metadata:Metadata={title:"المجموعات الهندسية"};export const dynamic="force-dynamic";
export default async function GroupsPage(){const user=await requireVerifiedPage();return <GroupsClient user={user}/>;}
