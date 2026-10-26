import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Brand } from "@/components/Brand";
import { LogoutButton } from "@/components/LogoutButton";
import { VerificationClient } from "@/components/VerificationClient";

export const metadata: Metadata = { title: "توثيق العضوية" };
export const dynamic = "force-dynamic";
type RequestStatus = { status: string; legal_name: string; review_note: string | null; created_at: string };
export default async function VerificationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.account_status !== "active") redirect("/login?status=suspended");
  if (user.verification_status === "verified") redirect(["admin", "reviewer", "moderator"].includes(user.role) ? "/admin" : "/feed");
  const result = await query<RequestStatus>("SELECT status, legal_name, review_note, created_at FROM verification_requests WHERE user_id=$1 LIMIT 1", [user.id]);
  const req = result.rows[0];
  const status = req?.status === "approved" ? "verified" : req?.status || user.verification_status;
  return <main><header className="topbar" style={{ position: "relative" }}><div className="topbar-inner"><Brand/><div className="topbar-actions"><span className="pill gold">{user.display_name}</span><LogoutButton/></div></div></header><VerificationClient initialStatus={status} legalName={req?.legal_name} reviewNote={req?.review_note} submittedAt={req?.created_at}/><footer className="footer-note">AXIS · المعاينة محدودة قبل اعتماد التوثيق.</footer></main>;
}
