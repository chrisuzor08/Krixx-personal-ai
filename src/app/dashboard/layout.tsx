import type { ReactNode } from "react";
import { requirePageCtx } from "@/lib/auth";
import { getUsage } from "@/lib/plans";
import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const ctx = await requirePageCtx();
  const usage = await getUsage(ctx.workspace.id, ctx.workspace.plan);
  return (
    <DashboardShell
      user={{ name: ctx.user.name, email: ctx.user.email, avatarUrl: ctx.user.avatarUrl }}
      workspace={{ name: ctx.workspace.name, plan: ctx.workspace.plan, role: ctx.role }}
      messages={usage.messages}
    >
      {children}
    </DashboardShell>
  );
}
