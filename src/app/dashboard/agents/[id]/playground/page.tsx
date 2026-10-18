import { notFound } from "next/navigation";
import { requirePageCtx } from "@/lib/auth";
import { getOwnedAgent } from "@/lib/agents";
import { modelAvailability } from "@/lib/ai/gateway";
import { getUsage } from "@/lib/plans";
import { Playground } from "./playground";

export const metadata = { title: "Playground" };

export default async function PlaygroundPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePageCtx();
  const { id } = await params;
  const full = await getOwnedAgent(ctx.workspace.id, id).catch(() => null);
  if (!full) notFound();
  const usage = await getUsage(ctx.workspace.id, ctx.workspace.plan);
  const { agent, settings } = full;
  return (
    <Playground
      agent={{ id: agent.id, name: agent.name, avatar: agent.avatar, avatarColor: agent.avatarColor, welcomeMessage: settings.welcomeMessage, suggestedPrompts: settings.suggestedPrompts, model: settings.model }}
      availability={modelAvailability()}
      plan={ctx.workspace.plan}
      usage={usage.messages}
    />
  );
}
