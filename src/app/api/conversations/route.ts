import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { handler, HttpError, json, requireCtx } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const ctx = await requireCtx();
  const agentId = new URL(req.url).searchParams.get("agentId");
  if (!agentId || !/^[0-9a-f-]{36}$/i.test(agentId)) throw new HttpError(400, "agentId required");
  const rows = await db
    .select({ id: conversations.id, title: conversations.title, source: conversations.source, updatedAt: conversations.updatedAt, count: count(messages.id) })
    .from(conversations)
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(and(eq(conversations.workspaceId, ctx.workspace.id), eq(conversations.agentId, agentId)))
    .groupBy(conversations.id)
    .orderBy(desc(conversations.updatedAt))
    .limit(100);
  return json({ conversations: rows });
});
