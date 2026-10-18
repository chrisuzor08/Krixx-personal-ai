import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeSources } from "@/db/schema";
import { audit, handler, HttpError, json, parseBody, requireCtx } from "@/lib/api";
import { getOwnedAgent } from "@/lib/agents";
import { indexSource } from "@/lib/knowledge";
import { knowledgeUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };

async function owned(workspaceId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "Source not found");
  const [s] = await db.select().from(knowledgeSources).where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.workspaceId, workspaceId))).limit(1);
  if (!s) throw new HttpError(404, "Source not found");
  return s;
}

export const PATCH = handler(async (req: Request, { params }: P) => {
  const ctx = await requireCtx({ edit: true });
  const { id } = await params;
  await owned(ctx.workspace.id, id);
  const body = await parseBody(req, knowledgeUpdateSchema);
  if (body.agentId) await getOwnedAgent(ctx.workspace.id, body.agentId);
  const patch: Partial<typeof knowledgeSources.$inferInsert> = { updatedAt: new Date() };
  if (body.name !== undefined) patch.name = body.name;
  if (body.enabled !== undefined) patch.enabled = body.enabled;
  if (body.agentId !== undefined) patch.agentId = body.agentId;
  if (body.reindex) patch.status = "processing";
  await db.update(knowledgeSources).set(patch).where(eq(knowledgeSources.id, id));
  if (body.reindex) await indexSource(id);
  const [s] = await db.select().from(knowledgeSources).where(eq(knowledgeSources.id, id));
  return json({ source: { ...s, rawText: undefined } });
});

export const DELETE = handler(async (_req: Request, { params }: P) => {
  const ctx = await requireCtx({ edit: true });
  const { id } = await params;
  await owned(ctx.workspace.id, id);
  await db.delete(knowledgeSources).where(eq(knowledgeSources.id, id));
  await audit(ctx, "knowledge.delete", id);
  return json({ ok: true });
});
