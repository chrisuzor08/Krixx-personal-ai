import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeSources } from "@/db/schema";
import { audit, handler, json, parseBody, rateLimit, requireCtx } from "@/lib/api";
import { getOwnedAgent } from "@/lib/agents";
import { indexSource } from "@/lib/knowledge";
import { assertLimit } from "@/lib/plans";
import { knowledgeCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const ctx = await requireCtx();
  const rows = await db
    .select({
      id: knowledgeSources.id, name: knowledgeSources.name, type: knowledgeSources.type, url: knowledgeSources.url, status: knowledgeSources.status,
      enabled: knowledgeSources.enabled, charCount: knowledgeSources.charCount, chunkCount: knowledgeSources.chunkCount, error: knowledgeSources.error,
      agentId: knowledgeSources.agentId, updatedAt: knowledgeSources.updatedAt,
    })
    .from(knowledgeSources)
    .where(eq(knowledgeSources.workspaceId, ctx.workspace.id))
    .orderBy(desc(knowledgeSources.createdAt));
  return json({ sources: rows });
});

export const POST = handler(async (req: Request) => {
  const ctx = await requireCtx({ edit: true });
  rateLimit(`kb:${ctx.user.id}`, 20, 60_000);
  const body = await parseBody(req, knowledgeCreateSchema);
  await assertLimit(ctx.workspace.id, ctx.workspace.plan, "knowledge");
  if (body.agentId) await getOwnedAgent(ctx.workspace.id, body.agentId);
  const [src] = await db
    .insert(knowledgeSources)
    .values({
      workspaceId: ctx.workspace.id,
      agentId: body.agentId ?? null,
      type: body.type,
      name: body.type === "url" ? body.name || new URL(body.url).hostname + new URL(body.url).pathname : body.name,
      url: body.type === "url" ? body.url : null,
      rawText: body.type === "url" ? "" : body.content,
    })
    .returning();
  await indexSource(src.id);
  await audit(ctx, "knowledge.create", src.id, { type: body.type });
  const [fresh] = await db.select().from(knowledgeSources).where(eq(knowledgeSources.id, src.id));
  return json({ source: { ...fresh, rawText: undefined } }, 201);
});
