import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, agentSettings } from "@/db/schema";
import { audit, handler, HttpError, json, parseBody, requireCtx } from "@/lib/api";
import { getOwnedAgent, slugify } from "@/lib/agents";
import { getModel } from "@/lib/ai/catalog";
import { assertLimit, planFor } from "@/lib/plans";
import { agentUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };

const AGENT_KEYS = ["name", "description", "avatar", "avatarColor", "templateId", "visibility", "status"] as const;

export const GET = handler(async (_req: Request, { params }: P) => {
  const ctx = await requireCtx();
  const { id } = await params;
  return json(await getOwnedAgent(ctx.workspace.id, id));
});

export const PATCH = handler(async (req: Request, { params }: P) => {
  const ctx = await requireCtx({ edit: true });
  const { id } = await params;
  await getOwnedAgent(ctx.workspace.id, id);
  const body = await parseBody(req, agentUpdateSchema);

  for (const m of [body.model, body.fallbackModel]) {
    if (!m) continue;
    const info = getModel(m);
    if (info.id !== m) throw new HttpError(400, "Unknown model");
    if (info.tier === "pro" && planFor(ctx.workspace.plan).id === "free") throw new HttpError(402, `${info.label} requires the Pro plan`, "plan_limit");
  }

  const agentPatch: Partial<typeof agents.$inferInsert> = {};
  const settingsPatch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue;
    if ((AGENT_KEYS as readonly string[]).includes(k)) (agentPatch as Record<string, unknown>)[k] = v;
    else settingsPatch[k] = v;
  }
  if (body.status === "published" && !body.visibility) agentPatch.visibility = "public";

  await db.transaction(async (tx) => {
    await tx.update(agents).set({ ...agentPatch, updatedAt: new Date() }).where(eq(agents.id, id));
    if (Object.keys(settingsPatch).length)
      await tx
        .update(agentSettings)
        .set({ ...(settingsPatch as Partial<typeof agentSettings.$inferInsert>), updatedAt: new Date() })
        .where(eq(agentSettings.agentId, id));
  });
  if (body.status) await audit(ctx, `agent.${body.status}`, id);
  return json(await getOwnedAgent(ctx.workspace.id, id));
});

export const DELETE = handler(async (_req: Request, { params }: P) => {
  const ctx = await requireCtx({ edit: true });
  const { id } = await params;
  await getOwnedAgent(ctx.workspace.id, id);
  await db.delete(agents).where(eq(agents.id, id));
  await audit(ctx, "agent.delete", id);
  return json({ ok: true });
});

/** POST actions: duplicate | regenerate-link */
export const POST = handler(async (req: Request, { params }: P) => {
  const ctx = await requireCtx({ edit: true });
  const { id } = await params;
  const action = new URL(req.url).searchParams.get("action");
  const { agent, settings } = await getOwnedAgent(ctx.workspace.id, id);

  if (action === "regenerate-link") {
    const slug = slugify(agent.name);
    await db.update(agents).set({ slug, updatedAt: new Date() }).where(eq(agents.id, id));
    await audit(ctx, "agent.regenerate_link", id);
    return json({ slug });
  }
  if (action === "duplicate") {
    await assertLimit(ctx.workspace.id, ctx.workspace.plan, "agents");
    const copy = await db.transaction(async (tx) => {
      const { id: _a, createdAt: _c, updatedAt: _u, slug: _s, ...rest } = agent;
      const name = `${agent.name} (copy)`.slice(0, 60);
      const [a] = await tx.insert(agents).values({ ...rest, name, slug: slugify(name), status: "draft", visibility: "private", createdBy: ctx.user.id }).returning();
      const { agentId: _x, updatedAt: _y, ...s } = settings;
      await tx.insert(agentSettings).values({ ...s, agentId: a.id });
      return a;
    });
    await audit(ctx, "agent.duplicate", copy.id, { from: id });
    return json({ agent: copy }, 201);
  }
  throw new HttpError(400, "Unknown action");
});
