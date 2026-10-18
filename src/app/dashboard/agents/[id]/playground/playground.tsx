"use client";
import { ArrowLeft, Bug, Eraser, History, Loader2, MessageSquarePlus, Settings2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChatPanel, type UIMessage } from "@/components/chat-panel";
import { useToast } from "@/components/toast";
import { AgentAvatar, Meter, Switch } from "@/components/ui";
import { MODELS } from "@/lib/ai/catalog";
import { api, errMsg } from "@/lib/client";

type Conv = { id: string; title: string; source: string; updatedAt: string; count: number };
type Agent = { id: string; name: string; avatar: string; avatarColor: string; welcomeMessage: string; suggestedPrompts: string[]; model: string };

export function Playground({ agent, availability, plan, usage }: { agent: Agent; availability: Record<string, boolean>; plan: string; usage: { used: number; limit: number } }) {
  const toast = useToast();
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [initialMsgs, setInitialMsgs] = useState<UIMessage[]>([]);
  const [panelKey, setPanelKey] = useState(0);
  const [loadingConv, setLoadingConv] = useState(false);
  const [debug, setDebug] = useState(true);
  const [model, setModel] = useState(agent.model);
  const [used, setUsed] = useState(usage.used);
  const [showHistory, setShowHistory] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ conversations: Conv[] }>(`/api/conversations?agentId=${agent.id}`);
      setConvs(r.conversations);
    } catch (e) {
      toast("error", errMsg(e));
      setConvs([]);
    }
  }, [agent.id, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function open(id: string) {
    setShowHistory(false);
    setLoadingConv(true);
    try {
      const r = await api<{ messages: (UIMessage & { error: string | null })[] }>(`/api/conversations/${id}`);
      setInitialMsgs(r.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, sources: m.sources, error: m.error, model: m.model })));
      setActive(id);
      setPanelKey((k) => k + 1);
    } catch (e) {
      toast("error", errMsg(e));
    }
    setLoadingConv(false);
  }

  function newConv() {
    setActive(null);
    setInitialMsgs([]);
    setPanelKey((k) => k + 1);
    setShowHistory(false);
  }

  async function clearConv() {
    if (!active) return newConv();
    try {
      await api(`/api/conversations/${active}?action=clear`, { method: "POST" });
      setInitialMsgs([]);
      setPanelKey((k) => k + 1);
      refresh();
      toast("success", "Conversation cleared");
    } catch (e) {
      toast("error", errMsg(e));
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this conversation permanently?")) return;
    try {
      await api(`/api/conversations/${id}`, { method: "DELETE" });
      setConvs((c) => c?.filter((x) => x.id !== id) ?? null);
      if (id === active) newConv();
      toast("success", "Conversation deleted");
    } catch (e) {
      toast("error", errMsg(e));
    }
  }

  const history = (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <button className="btn-primary w-full" onClick={newConv}><MessageSquarePlus className="size-4" /> New conversation</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <div className="label px-2">History</div>
        {convs === null ? (
          <div className="space-y-2 px-1">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12" />)}</div>
        ) : convs.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted">No conversations yet. Say hi to {agent.name}!</p>
        ) : (
          <ul className="space-y-0.5">
            {convs.map((c) => (
              <li key={c.id} className={`group flex items-center rounded-lg transition ${active === c.id ? "bg-elevated" : "hover:bg-elevated/60"}`}>
                <button onClick={() => open(c.id)} className="min-w-0 flex-1 px-2.5 py-2 text-left">
                  <div className="truncate text-sm">{c.title}</div>
                  <div className="text-[11px] text-muted">{c.count} msgs · {c.source} · {new Date(c.updatedAt).toLocaleDateString()}</div>
                </button>
                <button onClick={() => del(c.id)} className="mr-1 rounded-md p-1.5 text-muted opacity-0 transition hover:text-danger group-hover:opacity-100 focus:opacity-100" aria-label="Delete conversation"><Trash2 className="size-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-line p-3"><Meter label="Messages this month" used={used} limit={usage.limit} /></div>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface/40 md:block">{history}</aside>
      {showHistory && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowHistory(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface animate-fade-up">
            <button className="btn-ghost btn-sm absolute right-2 top-2 !px-2" onClick={() => setShowHistory(false)} aria-label="Close history"><X className="size-4" /></button>
            {history}
          </aside>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 sm:px-5">
          <Link href={`/dashboard/agents/${agent.id}`} className="btn-ghost btn-sm !px-2" aria-label="Back to editor"><ArrowLeft className="size-4" /></Link>
          <button className="btn-ghost btn-sm !px-2 md:hidden" onClick={() => setShowHistory(true)} aria-label="Conversation history"><History className="size-4" /></button>
          <AgentAvatar avatar={agent.avatar} color={agent.avatarColor} size={28} />
          <div className="mr-auto min-w-0">
            <div className="truncate text-sm font-medium">{agent.name}</div>
            <div className="text-[11px] text-muted">Playground</div>
          </div>
          <select className="input !h-8 !w-auto !text-xs" value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model for this session">
            {MODELS.map((m) => (
              <option key={m.id} value={m.id} disabled={m.tier === "pro" && plan === "free"}>{m.label}{!availability[m.id] ? " · needs key" : ""}{m.tier === "pro" && plan === "free" ? " · Pro" : ""}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-muted"><Bug className="size-3.5" /> <span className="hidden sm:inline">Debug</span><Switch checked={debug} onChange={setDebug} label="Debug mode" /></label>
          <button className="btn-ghost btn-sm" onClick={clearConv} title="Clear conversation"><Eraser className="size-4" /><span className="hidden lg:inline">Clear</span></button>
          <Link href={`/dashboard/agents/${agent.id}`} className="btn-ghost btn-sm !px-2" title="Agent settings"><Settings2 className="size-4" /></Link>
        </div>
        {!availability[model] && (
          <div className="border-b border-warn/20 bg-warn/10 px-5 py-2 text-xs text-warn">
            {model === "krixx-lite" ? "Running on KRiXX Lite — the built-in offline engine answers from your knowledge base only." : "This model's provider key isn't configured on the server; replies will use KRiXX Lite (offline) until it is."}
          </div>
        )}
        <div className="min-h-0 flex-1">
          {loadingConv ? (
            <div className="grid h-full place-items-center"><Loader2 className="size-6 animate-spin text-violet" /></div>
          ) : (
            <ChatPanel
              key={panelKey}
              agent={agent}
              agentId={agent.id}
              conversationId={active}
              initialMessages={initialMsgs}
              debug={debug}
              modelOverride={model !== agent.model ? model : undefined}
              onConversation={(id) => setActive(id)}
              onDone={() => {
                setUsed((u) => u + 1);
                refresh();
              }}
            />
          )}
        </div>
      </section>
    </div>
  );
}
