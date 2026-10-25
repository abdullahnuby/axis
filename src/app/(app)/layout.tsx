import type { ReactNode } from "react";
import { requireVerifiedPage } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

/** One shell for every signed-in page: the header, sidebar and bottom nav no longer remount on each navigation. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireVerifiedPage();
  return <AppShell user={user}>{children}</AppShell>;
}
