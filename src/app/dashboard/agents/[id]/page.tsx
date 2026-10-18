import { notFound } from "next/navigation";
import { requirePageCtx } from "@/lib/auth";
import { getOwnedAgent, DEFAULT_WIDGET } from "@/lib/agents";
import { modelAvailability } from "@/lib/ai/gateway";
import { AgentEditor } from "./agent-editor";

export const metadata = { title: "Agent Studio" };

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePageCtx();
  const { id } = await params;
  const full = await getOwnedAgent(ctx.workspace.id, id).catch(() => null);
  if (!full) notFound();
  const { agent, settings } = full;
  return (
    <AgentEditor
      id={agent.id}
      slug={agent.slug}
      plan={ctx.workspace.plan}
      availability={modelAvailability()}
      initial={{
        name: agent.name, description: agent.description, avatar: agent.avatar, avatarColor: agent.avatarColor, templateId: agent.templateId,
        visibility: agent.visibility as "private" | "public", status: agent.status as "draft" | "published" | "archived",
        personality: settings.personality, communicationStyle: settings.communicationStyle, responseLength: settings.responseLength as "concise" | "balanced" | "detailed",
        temperature: settings.temperature, primaryLanguage: settings.primaryLanguage, supportedLanguages: settings.supportedLanguages, welcomeMessage: settings.welcomeMessage,
        suggestedPrompts: settings.suggestedPrompts, systemPrompt: settings.systemPrompt, customInstructions: settings.customInstructions, model: settings.model,
        fallbackModel: settings.fallbackModel, maxTokens: settings.maxTokens, contextMessages: settings.contextMessages, responseFormat: settings.responseFormat as "markdown" | "plain",
        fallbackMessage: settings.fallbackMessage, hallucinationGuard: settings.hallucinationGuard, memoryEnabled: settings.memoryEnabled, memoryDays: settings.memoryDays,
        useKnowledge: settings.useKnowledge, knowledgeThreshold: settings.knowledgeThreshold, widget: settings.widget ?? DEFAULT_WIDGET,
      }}
    />
  );
}
