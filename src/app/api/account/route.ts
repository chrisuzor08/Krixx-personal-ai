import { and, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { reports, sessions, users, workspaces } from "@/db/schema";
import { audit, clientIp, handler, HttpError, json, parseBody, rateLimit, requireCtx } from "@/lib/api";
import { getPublicAgent } from "@/lib/agents";
import { canAdmin, destroySession, hashPassword, SESSION_COOKIE, sha256, verifyPassword } from "@/lib/auth";
import { profileSchema, reportSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PATCH = handler(async (req: Request) => {
  const ctx = await requireCtx();
  const body = await parseBody(req, profileSchema);
  if (body.name) await db.update(users).set({ name: body.name, updatedAt: new Date() }).where(eq(users.id, ctx.user.id));
  if (body.workspaceName) {
    if (!canAdmin(ctx.role)) throw new HttpError(403, "Only admins can rename the workspace");
    await db.update(workspaces).set({ name: body.workspaceName, updatedAt: new Date() }).where(eq(workspaces.id, ctx.workspace.id));
  }
  if (body.newPassword) {
    if (ctx.user.passwordHash && !(await verifyPassword(body.currentPassword ?? "", ctx.user.passwordHash)))
      throw new HttpError(400, "Current password is incorrect");
    await db.update(users).set({ passwordHash: await hashPassword(body.newPassword) }).where(eq(users.id, ctx.user.id));
    await audit(ctx, "auth.password_change");
  }
  return json({ ok: true });
});

/** POST ?action=signout-others | report */
export const POST = handler(async (req: Request) => {
  const action = new URL(req.url).searchParams.get("action");
  if (action === "report") {
    rateLimit(`report:${clientIp(req)}`, 10, 60 * 60_000);
    const body = await parseBody(req, reportSchema);
    let agentId = body.agentId ?? null;
    if (body.slug) agentId = (await getPublicAgent(body.slug))?.agent.id ?? null;
    if (!agentId) throw new HttpError(404, "Agent not found");
    await db.insert(reports).values({ agentId, messageId: body.messageId ?? null, reason: body.reason, details: body.details });
    return json({ ok: true });
  }
  if (action === "signout-others") {
    const ctx = await requireCtx();
    const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
    await db.delete(sessions).where(and(eq(sessions.userId, ctx.user.id), ne(sessions.id, sha256(token))));
    return json({ ok: true });
  }
  throw new HttpError(400, "Unknown action");
});

/** Permanently deletes the account and every workspace it owns (cascades to agents, conversations, knowledge). */
export const DELETE = handler(async () => {
  const ctx = await requireCtx();
  await audit(null, "account.delete", ctx.user.id);
  await db.delete(workspaces).where(eq(workspaces.ownerId, ctx.user.id));
  await db.delete(users).where(eq(users.id, ctx.user.id));
  await destroySession();
  return json({ ok: true });
});
