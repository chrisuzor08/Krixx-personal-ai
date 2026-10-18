import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { audit, handler, HttpError, json, requireCtx } from "@/lib/api";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };

async function owned(workspaceId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "Conversation not found");
  const [c] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.workspaceId, workspaceId))).limit(1);
  if (!c) throw new HttpError(404, "Conversation not found");
  return c;
}

export const GET = handler(async (_req: Request, { params }: P) => {
  const ctx = await requireCtx();
  const { id } = await params;
  const conv = await owned(ctx.workspace.id, id);
  const rows = await db.select().from(messages).where(eq(messages.conversationId, conv.id)).orderBy(asc(messages.createdAt));
  return json({ conversation: conv, messages: rows });
});

/** ?action=clear removes messages but keeps the session. */
export const POST = handler(async (req: Request, { params }: P) => {
  const ctx = await requireCtx({ edit: true });
  const { id } = await params;
  const conv = await owned(ctx.workspace.id, id);
  if (new URL(req.url).searchParams.get("action") !== "clear") throw new HttpError(400, "Unknown action");
  await db.delete(messages).where(eq(messages.conversationId, conv.id));
  return json({ ok: true });
});

export const DELETE = handler(async (_req: Request, { params }: P) => {
  const ctx = await requireCtx({ edit: true });
  const { id } = await params;
  const conv = await owned(ctx.workspace.id, id);
  await db.delete(conversations).where(eq(conversations.id, conv.id));
  await audit(ctx, "conversation.delete", conv.id);
  return json({ ok: true });
});
