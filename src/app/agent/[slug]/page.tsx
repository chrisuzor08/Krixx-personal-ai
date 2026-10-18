import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicAgent, DEFAULT_WIDGET } from "@/lib/agents";
import { AgentAvatar, Logo, ThemeToggle } from "@/components/ui";
import { PublicChat } from "./public-chat";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const full = await getPublicAgent((await params).slug);
  return full ? { title: full.agent.name, description: full.agent.description } : { title: "Agent not found" };
}

export default async function PublicAgentPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ embed?: string }> }) {
  const { slug } = await params;
  const embed = (await searchParams).embed === "1";
  const full = await getPublicAgent(slug);
  if (!full) notFound();
  const { agent, settings } = full;
  const w = { ...DEFAULT_WIDGET, ...(settings.widget ?? {}) };
  const chatAgent = { name: agent.name, avatar: agent.avatar, avatarColor: agent.avatarColor, welcomeMessage: settings.welcomeMessage, suggestedPrompts: settings.suggestedPrompts };

  if (embed)
    return (
      <div className="flex h-dvh flex-col bg-bg">
        <div className="flex items-center gap-2.5 px-4 py-3 text-white" style={{ background: w.primaryColor }}>
          <span className="text-xl">{agent.avatar}</span>
          <span className="text-sm font-medium">{w.headerText || agent.name}</span>
        </div>
        <div className="min-h-0 flex-1"><PublicChat agent={chatAgent} slug={slug} accent={w.primaryColor} compact /></div>
        {w.showBranding && <a href="/" target="_blank" className="pb-1.5 text-center text-[10px] text-muted">Powered by KRiXX AI</a>}
      </div>
    );

  return (
    <div className="flex h-dvh flex-col">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-80 opacity-25" style={{ background: `radial-gradient(60% 100% at 50% 0%, ${agent.avatarColor}, transparent)` }} />
      <header className="flex items-center gap-3 border-b border-line bg-bg/70 px-4 py-3 backdrop-blur sm:px-6">
        <AgentAvatar avatar={agent.avatar} color={agent.avatarColor} size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{agent.name}</h1>
          <p className="truncate text-xs text-muted">{agent.description}</p>
        </div>
        <ThemeToggle />
      </header>
      <main className="min-h-0 flex-1"><PublicChat agent={chatAgent} slug={slug} accent={agent.avatarColor} /></main>
      {w.showBranding && (
        <footer className="flex items-center justify-center gap-2 border-t border-line py-2 text-[11px] text-muted">
          Built with <span className="scale-75"><Logo size="sm" /></span> · <Link href="/terms" className="hover:text-fg">Terms</Link> · <Link href="/privacy" className="hover:text-fg">Privacy</Link>
        </footer>
      )}
    </div>
  );
}
