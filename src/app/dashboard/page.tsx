import { and, count, desc, eq, sum } from "drizzle-orm";
import { Activity, Bot, Database, MessageSquare, MessagesSquare, Plus, Rocket, Zap } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { agents, auditLogs, conversations, knowledgeSources, messages, usageRecords } from "@/db/schema";
import { requirePageCtx } from "@/lib/auth";
import { currentPeriod, getUsage } from "@/lib/plans";
import { PageHeader, StatCard } from "@/components/page-header";
import { AgentAvatar, EmptyState, Meter, StatusBadge } from "@/components/ui";

export const metadata = { title: "Dashboard" };

const ACTIONS: Record<string, string> = {
  "auth.signup": "Created the workspace",
  "auth.login": "Signed in",
  "agent.create": "Created an agent",
  "agent.duplicate": "Duplicated an agent",
  "agent.delete": "Deleted an agent",
  "agent.published": "Published an agent",
  "agent.draft": "Unpublished an agent",
  "agent.archived": "Archived an agent",
  "agent.regenerate_link": "Regenerated a share link",
  "knowledge.create": "Added a knowledge source",
  "knowledge.delete": "Removed a knowledge source",
  "conversation.delete": "Deleted a conversation",
  "auth.password_change": "Changed password",
};

export default async function DashboardPage() {
  const ctx = await requirePageCtx();
  const ws = ctx.workspace.id;
  const [usage, [convs], [msgs], [published], [tokens], recentAgents, activity, [kb]] = await Promise.all([
    getUsage(ws, ctx.workspace.plan),
    db.select({ c: count() }).from(conversations).where(eq(conversations.workspaceId, ws)),
    db.select({ c: count() }).from(messages).innerJoin(conversations, eq(conversations.id, messages.conversationId)).where(eq(conversations.workspaceId, ws)),
    db.select({ c: count() }).from(agents).where(and(eq(agents.workspaceId, ws), eq(agents.status, "published"))),
    db.select({ t: sum(usageRecords.tokens) }).from(usageRecords).where(and(eq(usageRecords.workspaceId, ws), eq(usageRecords.period, currentPeriod()))),
    db.select().from(agents).where(eq(agents.workspaceId, ws)).orderBy(desc(agents.updatedAt)).limit(5),
    db.select().from(auditLogs).where(eq(auditLogs.workspaceId, ws)).orderBy(desc(auditLogs.createdAt)).limit(8),
    db.select({ c: count() }).from(knowledgeSources).where(eq(knowledgeSources.workspaceId, ws)),
  ]);

  const first = ctx.user.name.split(" ")[0] || "there";

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={`Welcome back, ${first}`}
        description="Here's what's happening across your AI agents."
        actions={<Link href="/dashboard/agents/new" className="btn-primary"><Plus className="size-4" /> New agent</Link>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Agents" value={usage.agents.used} hint={`${published.c} published`} icon={<Bot className="size-4" />} />
        <StatCard label="Conversations" value={convs.c} icon={<MessagesSquare className="size-4" />} />
        <StatCard label="Messages" value={msgs.c} hint="All time" icon={<MessageSquare className="size-4" />} />
        <StatCard label="Tokens this month" value={Number(tokens.t ?? 0)} icon={<Zap className="size-4" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recent agents</h2>
            <Link href="/dashboard/agents" className="text-xs text-violet hover:underline">View all</Link>
          </div>
          {recentAgents.length === 0 ? (
            <EmptyState icon={<Bot className="size-7" />} title="No agents yet" text="Create your first AI agent from one of 12 professionally designed templates." action={<Link href="/dashboard/agents/new" className="btn-primary"><Plus className="size-4" /> Create agent</Link>} />
          ) : (
            <ul className="divide-y divide-line">
              {recentAgents.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <AgentAvatar avatar={a.avatar} color={a.avatarColor} size={36} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/agents/${a.id}`} className="block truncate text-sm font-medium hover:text-violet">{a.name}</Link>
                    <div className="truncate text-xs text-muted">{a.description}</div>
                  </div>
                  <StatusBadge status={a.status} />
                  <Link href={`/dashboard/agents/${a.id}/playground`} className="btn-secondary btn-sm hidden sm:inline-flex">Test</Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Monthly usage</h2>
              <span className="badge border-violet/30 bg-violet-soft capitalize text-violet">{ctx.workspace.plan}</span>
            </div>
            <Meter label="Messages" used={usage.messages.used} limit={usage.messages.limit} />
            <Meter label="Agents" used={usage.agents.used} limit={usage.agents.limit} />
            <Meter label="Knowledge sources" used={kb.c} limit={usage.knowledge.limit} />
            <p className="text-xs text-muted">Resets {new Date(usage.resetsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
          </div>
          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold"><Activity className="size-4 text-cyan" /> Recent activity</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-muted">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet" />
                    <div>
                      <div>{ACTIONS[a.action] ?? a.action}</div>
                      <div className="text-xs text-muted">{a.createdAt.toLocaleString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { href: "/dashboard/knowledge", icon: Database, t: "Train with knowledge", d: "Add docs and URLs for grounded answers." },
          { href: "/dashboard/deployments", icon: Rocket, t: "Deploy an agent", d: "Share a link or embed a widget." },
          { href: "/dashboard/analytics", icon: Activity, t: "See analytics", d: "Messages, tokens, latency & more." },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="card group p-5 transition hover:border-violet/40">
            <q.icon className="size-5 text-violet" />
            <div className="mt-3 font-medium group-hover:text-violet">{q.t}</div>
            <div className="text-sm text-muted">{q.d}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
