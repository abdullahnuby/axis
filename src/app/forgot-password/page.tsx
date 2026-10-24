import type { Metadata } from "next";
import { PasswordResetRequestClient } from "@/components/PasswordResetClients";
export const metadata:Metadata={title:"استعادة كلمة المرور"};
export default function ForgotPasswordPage(){return <PasswordResetRequestClient/>;}
