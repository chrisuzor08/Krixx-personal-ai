import "server-only";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, knowledgeSources, usageRecords } from "@/db/schema";
import { HttpError } from "./api";
import { PLANS, type PlanId } from "./plan-config";

export const currentPeriod = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export function nextResetDate(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

export function planFor(plan: string) {
  return PLANS[(plan in PLANS ? plan : "free") as PlanId];
}

export async function getUsage(workspaceId: string, plan: string) {
  const limits = planFor(plan).limits;
  const [[m], [a], [k]] = await Promise.all([
    db
      .select({ c: count() })
      .from(usageRecords)
      .where(and(eq(usageRecords.workspaceId, workspaceId), eq(usageRecords.period, currentPeriod()), eq(usageRecords.kind, "message"))),
    db.select({ c: count() }).from(agents).where(eq(agents.workspaceId, workspaceId)),
    db.select({ c: count() }).from(knowledgeSources).where(eq(knowledgeSources.workspaceId, workspaceId)),
  ]);
  return {
    messages: { used: m.c, limit: limits.messages },
    agents: { used: a.c, limit: limits.agents },
    knowledge: { used: k.c, limit: limits.knowledge },
    resetsAt: nextResetDate().toISOString(),
    period: currentPeriod(),
  };
}

export type Usage = Awaited<ReturnType<typeof getUsage>>;

export async function assertLimit(workspaceId: string, plan: string, kind: "messages" | "agents" | "knowledge") {
  const u = await getUsage(workspaceId, plan);
  const item = u[kind];
  if (item.used >= item.limit) {
    const label = { messages: "monthly messages", agents: "agents", knowledge: "knowledge sources" }[kind];
    throw new HttpError(402, `You've reached your plan's limit of ${item.limit} ${label}. Visit Pricing to learn about upgrades.`, "plan_limit");
  }
}
