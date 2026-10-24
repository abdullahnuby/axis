import type { Metadata } from "next";
import { requireVerifiedPage } from "@/lib/auth";
import { PeopleClient } from "@/components/PeopleClient";
export const metadata: Metadata = { title: "دليل المهندسين" };
export const dynamic = "force-dynamic";
export default async function PeoplePage(){const user=await requireVerifiedPage();return <PeopleClient user={user}/>;}
