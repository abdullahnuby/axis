import type { Metadata } from "next";
import { VerifyEmailClient } from "@/components/PasswordResetClients";
export const metadata: Metadata = { title: "تأكيد البريد الإلكتروني" };
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <VerifyEmailClient token={params.token || ""} />;
}
