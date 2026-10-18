"use client";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useToast } from "@/components/toast";
import { AgentAvatar } from "@/components/ui";
import { api, errMsg } from "@/lib/client";
import { TEMPLATES } from "@/lib/templates";

function NewAgent() {
  const router = useRouter();
  const toast = useToast();
  const welcome = useSearchParams().get("welcome");
  const [selected, setSelected] = useState("support");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const t = TEMPLATES.find((x) => x.id === selected)!;

  async function create() {
    setLoading(true);
    try {
      const { agent } = await api<{ agent: { id: string } }>("/api/agents", { body: { templateId: selected, name: name.trim() || undefined } });
      toast("success", "Agent created — customize it below");
      router.push(`/dashboard/agents/${agent.id}`);
    } catch (e) {
      toast("error", errMsg(e));
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <Link href="/dashboard/agents" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Agents</Link>
      {welcome && (
        <div className="card mb-6 flex items-center gap-3 border-violet/30 p-4 text-sm">
          <Sparkles className="size-5 shrink-0 text-violet" />
          <span>Welcome to KRiXX AI! Let&apos;s build your first agent — pick a starting personality below.</span>
        </div>
      )}
      <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Create a new agent</h1>
      <p className="mt-1 text-sm text-muted">Choose a professionally designed preset. Every setting stays fully customizable.</p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Templates">
          {TEMPLATES.map((tp) => (
            <button
              key={tp.id}
              role="radio"
              aria-checked={selected === tp.id}
              onClick={() => setSelected(tp.id)}
              className={`card flex flex-col items-start gap-3 p-4 text-left transition ${selected === tp.id ? "!border-violet ring-4 ring-violet-soft" : "hover:border-line-strong"}`}
            >
              <AgentAvatar avatar={tp.avatar} color={tp.color} size={38} />
              <div>
                <div className="text-sm font-medium">{tp.name}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted">{tp.description}</div>
              </div>
            </button>
          ))}
        </div>

        <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-20">
          <div className="flex items-center gap-3">
            <AgentAvatar avatar={t.avatar} color={t.color} size={48} />
            <div>
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-muted">{t.personality}</div>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="agent-name">Agent name</label>
            <input id="agent-name" className="input" placeholder={t.id === "custom" ? "My Agent" : t.name} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>
          <div>
            <div className="label">System prompt preview</div>
            <p className="max-h-40 overflow-y-auto rounded-xl border border-line bg-elevated p-3 text-xs leading-relaxed text-muted">{t.systemPrompt}</p>
          </div>
          <button className="btn-primary h-11 w-full" onClick={create} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Create agent
          </button>
        </aside>
      </div>
    </div>
  );
}

export default function NewAgentPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96" />}>
      <NewAgent />
    </Suspense>
  );
}
