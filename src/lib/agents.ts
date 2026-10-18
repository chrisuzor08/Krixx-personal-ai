import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, agentSettings, type WidgetConfig } from "@/db/schema";
import { HttpError } from "./api";
import { randomToken } from "./auth";

export const DEFAULT_WIDGET: WidgetConfig = {
  primaryColor: "#8B5CF6",
  position: "right",
  launcherIcon: "💬",
  headerText: "Chat with us",
  width: 380,
  height: 600,
  showBranding: true,
};

export function slugify(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "agent";
  return `${base}-${randomToken(4).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5)}`;
}

/** Loads an agent + settings, enforcing that it belongs to the caller's workspace. */
export async function getOwnedAgent(workspaceId: string, agentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(agentId)) throw new HttpError(404, "Agent not found");
  const rows = await db
    .select({ agent: agents, settings: agentSettings })
    .from(agents)
    .innerJoin(agentSettings, eq(agentSettings.agentId, agents.id))
    .where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)))
    .limit(1);
  if (!rows[0]) throw new HttpError(404, "Agent not found");
  return rows[0];
}

export async function getPublicAgent(slug: string) {
  const rows = await db
    .select({ agent: agents, settings: agentSettings })
    .from(agents)
    .innerJoin(agentSettings, eq(agentSettings.agentId, agents.id))
    .where(and(eq(agents.slug, slug), eq(agents.status, "published"), eq(agents.visibility, "public")))
    .limit(1);
  return rows[0] ?? null;
}

export type FullAgent = Awaited<ReturnType<typeof getOwnedAgent>>;
