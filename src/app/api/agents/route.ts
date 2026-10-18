import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, agentSettings } from "@/db/schema";
import { audit, handler, json, parseBody, rateLimit, requireCtx } from "@/lib/api";
import { DEFAULT_WIDGET, slugify } from "@/lib/agents";
import { assertLimit } from "@/lib/plans";
import { getTemplate } from "@/lib/templates";
import { agentCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const ctx = await requireCtx();
  const rows = await db.select().from(agents).where(eq(agents.workspaceId, ctx.workspace.id)).orderBy(desc(agents.updatedAt));
  return json({ agents: rows });
});

export const POST = handler(async (req: Request) => {
  const ctx = await requireCtx({ edit: true });
  rateLimit(`agent-create:${ctx.user.id}`, 20, 60_000);
  const body = await parseBody(req, agentCreateSchema);
  await assertLimit(ctx.workspace.id, ctx.workspace.plan, "agents");
  const t = getTemplate(body.templateId);
  const name = body.name || (t.id === "custom" ? "My Agent" : t.name);
  const agent = await db.transaction(async (tx) => {
    const [a] = await tx
      .insert(agents)
      .values({
        workspaceId: ctx.workspace.id,
        createdBy: ctx.user.id,
        name,
        slug: slugify(name),
        description: t.description,
        avatar: t.avatar,
        avatarColor: t.color,
        templateId: t.id,
      })
      .returning();
    await tx.insert(agentSettings).values({
      agentId: a.id,
      personality: t.personality,
      communicationStyle: t.style,
      temperature: t.temperature,
      primaryLanguage: t.language ?? "English",
      welcomeMessage: t.welcome,
      suggestedPrompts: t.prompts,
      systemPrompt: t.systemPrompt,
      model: process.env.DEFAULT_MODEL || (process.env.OPENAI_API_KEY ? "gpt-4o-mini" : process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : process.env.ANTHROPIC_API_KEY ? "claude-3-5-haiku" : "krixx-lite"),
      widget: { ...DEFAULT_WIDGET, primaryColor: t.color.length === 7 ? t.color : DEFAULT_WIDGET.primaryColor, headerText: name },
    });
    return a;
  });
  await audit(ctx, "agent.create", agent.id, { template: t.id });
  return json({ agent }, 201);
});
