import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, knowledgeSources } from "@/db/schema";
import { requirePageCtx } from "@/lib/auth";
import { planFor } from "@/lib/plans";
import { PageHeader } from "@/components/page-header";
import { KnowledgeManager } from "./knowledge-manager";

export const metadata = { title: "Knowledge" };

export default async function KnowledgePage() {
  const ctx = await requirePageCtx();
  const [sources, agentList] = await Promise.all([
    db
      .select({ id: knowledgeSources.id, name: knowledgeSources.name, type: knowledgeSources.type, url: knowledgeSources.url, status: knowledgeSources.status, enabled: knowledgeSources.enabled, charCount: knowledgeSources.charCount, chunkCount: knowledgeSources.chunkCount, error: knowledgeSources.error, agentId: knowledgeSources.agentId, updatedAt: knowledgeSources.updatedAt })
      .from(knowledgeSources)
      .where(eq(knowledgeSources.workspaceId, ctx.workspace.id))
      .orderBy(desc(knowledgeSources.createdAt)),
    db.select({ id: agents.id, name: agents.name }).from(agents).where(eq(agents.workspaceId, ctx.workspace.id)),
  ]);
  return (
    <div className="animate-fade-up">
      <PageHeader title="Knowledge" description="Train your agents on your own content. Sources are chunked, indexed and retrieved on every message." />
      <KnowledgeManager initial={sources.map((s) => ({ ...s, updatedAt: s.updatedAt.toISOString() }))} agents={agentList} limit={planFor(ctx.workspace.plan).limits.knowledge} />
    </div>
  );
}
