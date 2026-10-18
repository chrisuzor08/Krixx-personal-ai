import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, sessions, users, workspaceMembers } from "@/db/schema";
import { requirePageCtx } from "@/lib/auth";
import { getUsage } from "@/lib/plans";
import { PageHeader } from "@/components/page-header";
import { SettingsForms } from "./settings-forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requirePageCtx();
  const [members, [sess], logs, usage] = await Promise.all([
    db.select({ name: users.name, email: users.email, role: workspaceMembers.role }).from(workspaceMembers).innerJoin(users, eq(users.id, workspaceMembers.userId)).where(eq(workspaceMembers.workspaceId, ctx.workspace.id)),
    db.select({ c: count() }).from(sessions).where(eq(sessions.userId, ctx.user.id)),
    db.select().from(auditLogs).where(eq(auditLogs.workspaceId, ctx.workspace.id)).orderBy(desc(auditLogs.createdAt)).limit(15),
    getUsage(ctx.workspace.id, ctx.workspace.plan),
  ]);
  return (
    <div className="animate-fade-up">
      <PageHeader title="Settings" description="Manage your profile, workspace, security and data." />
      <SettingsForms
        user={{ name: ctx.user.name, email: ctx.user.email, verified: !!ctx.user.emailVerifiedAt, hasPassword: !!ctx.user.passwordHash, google: !!ctx.user.googleId }}
        workspace={{ name: ctx.workspace.name, plan: ctx.workspace.plan, role: ctx.role }}
        members={members}
        sessions={sess.c}
        usage={usage}
        logs={logs.map((l) => ({ id: l.id, action: l.action, at: l.createdAt.toISOString() }))}
      />
    </div>
  );
}
