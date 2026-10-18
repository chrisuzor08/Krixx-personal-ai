import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, agentSettings } from "@/db/schema";
import { requirePageCtx } from "@/lib/auth";
import { DEFAULT_WIDGET } from "@/lib/agents";
import { PageHeader } from "@/components/page-header";
import { DeploymentCenter } from "./deployment-center";

export const metadata = { title: "Deployments" };

export default async function DeploymentsPage() {
  const ctx = await requirePageCtx();
  const rows = await db
    .select({ agent: agents, widget: agentSettings.widget, welcome: agentSettings.welcomeMessage })
    .from(agents)
    .innerJoin(agentSettings, eq(agentSettings.agentId, agents.id))
    .where(eq(agents.workspaceId, ctx.workspace.id))
    .orderBy(desc(agents.updatedAt));
  return (
    <div className="animate-fade-up">
      <PageHeader title="Deployment Center" description="Publish agents to shareable pages and embed them on any website." />
      <DeploymentCenter
        agents={rows.map((r) => ({ id: r.agent.id, name: r.agent.name, slug: r.agent.slug, avatar: r.agent.avatar, avatarColor: r.agent.avatarColor, status: r.agent.status, visibility: r.agent.visibility, welcome: r.welcome, widget: r.widget ?? DEFAULT_WIDGET }))}
      />
    </div>
  );
}
