import { count, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { agents, conversations } from "@/db/schema";
import { requirePageCtx } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { AgentsList } from "./agents-list";

export const metadata = { title: "Agents" };

export default async function AgentsPage() {
  const ctx = await requirePageCtx();
  const rows = await db
    .select({ agent: agents, convs: count(conversations.id) })
    .from(agents)
    .leftJoin(conversations, eq(conversations.agentId, agents.id))
    .where(eq(agents.workspaceId, ctx.workspace.id))
    .groupBy(agents.id)
    .orderBy(desc(agents.updatedAt));
  return (
    <div className="animate-fade-up">
      <PageHeader title="Agents" description="Create, manage and test your AI agents." actions={<Link href="/dashboard/agents/new" className="btn-primary"><Plus className="size-4" /> New agent</Link>} />
      <AgentsList
        initial={rows.map((r) => ({
          id: r.agent.id, name: r.agent.name, description: r.agent.description, avatar: r.agent.avatar, avatarColor: r.agent.avatarColor,
          status: r.agent.status, slug: r.agent.slug, updatedAt: r.agent.updatedAt.toISOString(), createdAt: r.agent.createdAt.toISOString(), conversations: r.convs,
        }))}
      />
    </div>
  );
}
