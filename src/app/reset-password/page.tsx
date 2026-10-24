import type { Metadata } from "next";
import { PasswordResetClient } from "@/components/PasswordResetClients";
export const metadata:Metadata={title:"كلمة مرور جديدة"};
export default async function ResetPasswordPage({searchParams}:{searchParams:Promise<{token?:string}>}){const params=await searchParams;return <PasswordResetClient token={params.token||""}/>;}
