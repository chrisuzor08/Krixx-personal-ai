"use client";
import { ChatPanel } from "@/components/chat-panel";

type Props = {
  agent: { name: string; avatar: string; avatarColor: string; welcomeMessage: string; suggestedPrompts: string[] };
  slug: string;
  accent: string;
  compact?: boolean;
};

export function PublicChat(p: Props) {
  return <ChatPanel agent={p.agent} slug={p.slug} accent={p.accent} compact={p.compact} />;
}
