"use client";
import { ArrowLeft, Brain, Check, Database, Loader2, Lock, MessageSquare, Palette, Play, Plus, Rocket, Save, Sliders, Sparkles, Trash2, User, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useToast } from "@/components/toast";
import { AgentAvatar, Switch } from "@/components/ui";
import { MODELS, PROVIDER_LABELS } from "@/lib/ai/catalog";
import { api, errMsg } from "@/lib/client";
import { LANGUAGES, STYLES, TEMPLATES } from "@/lib/templates";
import type { WidgetConfig } from "@/db/schema";

export type EditorState = {
  name: string; description: string; avatar: string; avatarColor: string; templateId: string;
  visibility: "private" | "public"; status: "draft" | "published" | "archived";
  personality: string; communicationStyle: string; responseLength: "concise" | "balanced" | "detailed"; temperature: number;
  primaryLanguage: string; supportedLanguages: string[]; welcomeMessage: string; suggestedPrompts: string[];
  systemPrompt: string; customInstructions: string; model: string; fallbackModel: string | null; maxTokens: number; contextMessages: number;
  responseFormat: "markdown" | "plain"; fallbackMessage: string; hallucinationGuard: boolean; memoryEnabled: boolean; memoryDays: number;
  useKnowledge: boolean; knowledgeThreshold: number; widget: WidgetConfig;
};

const EMOJIS = ["🤖", "✨", "🎧", "🎓", "💼", "📊", "🔬", "💻", "✍️", "📱", "🛍️", "🪙", "🇳🇬", "🧠", "🦊", "🚀", "🌟", "💡", "🐙", "👩🏾‍💼"];
const COLORS = ["#8B5CF6", "#22D3EE", "#EC4899", "#10B981", "#F59E0B", "#38BDF8", "#F43F5E", "#A78BFA", "#14B8A6", "#EAB308"];

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "personality", label: "Personality", icon: Palette },
  { id: "instructions", label: "Instructions", icon: Sparkles },
  { id: "model", label: "AI Model", icon: Brain },
  { id: "knowledge", label: "Knowledge & Memory", icon: Database },
] as const;

export function AgentEditor({ id, slug, initial, availability, plan }: { id: string; slug: string; initial: EditorState; availability: Record<string, boolean>; plan: string }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("profile");
  const [saving, setSaving] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const set = <K extends keyof EditorState>(k: K, v: EditorState[K]) => setS((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  async function save(extra?: Partial<EditorState>) {
    setSaving(true);
    const body = { ...s, ...extra };
    try {
      await api(`/api/agents/${id}`, { method: "PATCH", body });
      setS(body);
      setSaved(body);
      toast("success", "Agent saved");
      router.refresh();
      return true;
    } catch (e) {
      toast("error", errMsg(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  function applyTemplate(tid: string) {
    const t = TEMPLATES.find((x) => x.id === tid);
    if (!t) return;
    if (s.systemPrompt && !confirm(`Apply "${t.name}"? This replaces the system prompt, personality, welcome message and suggested prompts.`)) return;
    setS((p) => ({ ...p, templateId: t.id, systemPrompt: t.systemPrompt, personality: t.personality, communicationStyle: t.style, welcomeMessage: t.welcome, suggestedPrompts: t.prompts, temperature: t.temperature, primaryLanguage: t.language ?? p.primaryLanguage }));
  }

  const creativity = s.temperature < 0.35 ? "Precise" : s.temperature < 0.75 ? "Balanced" : s.temperature < 1.1 ? "Creative" : "Wild";

  return (
    <div className="animate-fade-up pb-24">
      <Link href="/dashboard/agents" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Agents</Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <AgentAvatar avatar={s.avatar} color={s.avatarColor} size={52} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{s.name || "Untitled agent"}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <span className={`badge ${saved.status === "published" ? "border-success/30 bg-success/10 text-success" : "border-line-strong"}`}>{saved.status}</span>
              <span className="flex items-center gap-1">{saved.visibility === "public" ? <Rocket className="size-3" /> : <Lock className="size-3" />} {saved.visibility}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/agents/${id}/playground`} className="btn-secondary"><Play className="size-4" /> Test in playground</Link>
          {saved.status === "published" ? (
            <button className="btn-secondary" disabled={saving} onClick={() => save({ status: "draft" })}>Unpublish</button>
          ) : (
            <button className="btn-secondary" disabled={saving} onClick={() => save({ status: "published", visibility: "public" })}><Rocket className="size-4" /> Publish</button>
          )}
          <button className="btn-primary" disabled={!dirty || saving} onClick={() => save()}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${tab === t.id ? "bg-elevated text-fg shadow-soft" : "text-muted hover:text-fg"}`}>
                <t.icon className="size-4" /> {t.label}
              </button>
            ))}
          </div>

          <div className="card space-y-6 p-6" role="tabpanel">
            {tab === "profile" && (
              <>
                <Field label="Agent name"><input className="input" value={s.name} maxLength={60} onChange={(e) => set("name", e.target.value)} /></Field>
                <Field label="Description" hint="Shown on your public agent page."><textarea className="input" rows={2} maxLength={300} value={s.description} onChange={(e) => set("description", e.target.value)} /></Field>
                <Field label="Avatar">
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map((e) => (
                      <button key={e} onClick={() => set("avatar", e)} className={`grid size-10 place-items-center rounded-xl border text-xl transition ${s.avatar === e ? "border-violet bg-violet-soft" : "border-line hover:border-line-strong"}`} aria-label={`Avatar ${e}`}>{e}</button>
                    ))}
                  </div>
                </Field>
                <Field label="Accent color">
                  <div className="flex flex-wrap items-center gap-2">
                    {COLORS.map((c) => (
                      <button key={c} onClick={() => set("avatarColor", c)} className="grid size-8 place-items-center rounded-full" style={{ background: c }} aria-label={`Color ${c}`}>{s.avatarColor === c && <Check className="size-4 text-white" />}</button>
                    ))}
                    <input type="color" value={s.avatarColor} onChange={(e) => set("avatarColor", e.target.value)} className="size-8 cursor-pointer rounded-full border-0 bg-transparent" aria-label="Custom color" />
                  </div>
                </Field>
                <Row label="Public visibility" hint="Public agents can be reached by anyone with the share link once published.">
                  <Switch checked={s.visibility === "public"} onChange={(v) => set("visibility", v ? "public" : "private")} label="Public visibility" />
                </Row>
                <Field label="Welcome message"><textarea className="input" rows={2} maxLength={500} value={s.welcomeMessage} onChange={(e) => set("welcomeMessage", e.target.value)} /></Field>
                <Field label="Suggested prompts" hint="Up to 6 conversation starters.">
                  <div className="space-y-2">
                    {s.suggestedPrompts.map((p, i) => (
                      <div key={i} className="flex gap-2">
                        <input className="input" value={p} maxLength={120} onChange={(e) => set("suggestedPrompts", s.suggestedPrompts.map((x, j) => (j === i ? e.target.value : x)))} />
                        <button className="btn-ghost !px-2.5" onClick={() => set("suggestedPrompts", s.suggestedPrompts.filter((_, j) => j !== i))} aria-label="Remove prompt"><X className="size-4" /></button>
                      </div>
                    ))}
                    {s.suggestedPrompts.length < 6 && (
                      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newPrompt.trim()) { set("suggestedPrompts", [...s.suggestedPrompts, newPrompt.trim()]); setNewPrompt(""); } }}>
                        <input className="input" placeholder="Add a suggested prompt…" value={newPrompt} maxLength={120} onChange={(e) => setNewPrompt(e.target.value)} />
                        <button className="btn-secondary !px-3" aria-label="Add prompt"><Plus className="size-4" /></button>
                      </form>
                    )}
                  </div>
                </Field>
              </>
            )}

            {tab === "personality" && (
              <>
                <Field label="Personality preset" hint="Applying a preset auto-populates a customizable system prompt.">
                  <select className="input" value={s.templateId} onChange={(e) => applyTemplate(e.target.value)}>
                    {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.avatar} {t.name}</option>)}
                  </select>
                </Field>
                <Field label="Personality traits"><input className="input" maxLength={300} value={s.personality} onChange={(e) => set("personality", e.target.value)} placeholder="e.g. Warm, witty, concise" /></Field>
                <Field label="Communication style">
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map((st) => (
                      <button key={st} onClick={() => set("communicationStyle", st)} className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${s.communicationStyle === st ? "border-violet bg-violet-soft text-fg" : "border-line-strong text-muted hover:text-fg"}`}>{st}</button>
                    ))}
                  </div>
                </Field>
                <Field label="Response length">
                  <div className="grid grid-cols-3 gap-2">
                    {(["concise", "balanced", "detailed"] as const).map((l) => (
                      <button key={l} onClick={() => set("responseLength", l)} className={`rounded-xl border px-3 py-2.5 text-sm capitalize transition ${s.responseLength === l ? "border-violet bg-violet-soft" : "border-line-strong text-muted hover:text-fg"}`}>{l}</button>
                    ))}
                  </div>
                </Field>
                <Field label={`Creativity · ${creativity} (${s.temperature.toFixed(2)})`}>
                  <input type="range" min={0} max={1.5} step={0.05} value={s.temperature} onChange={(e) => set("temperature", Number(e.target.value))} className="w-full accent-[var(--violet)]" aria-label="Creativity" />
                  <div className="mt-1 flex justify-between text-[11px] text-muted"><span>Precise</span><span>Creative</span></div>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Primary language">
                    <select className="input" value={s.primaryLanguage} onChange={(e) => set("primaryLanguage", e.target.value)}>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select>
                  </Field>
                  <Field label="Also supports">
                    <div className="flex flex-wrap gap-1.5">
                      {LANGUAGES.filter((l) => l !== s.primaryLanguage).map((l) => {
                        const on = s.supportedLanguages.includes(l);
                        return <button key={l} onClick={() => set("supportedLanguages", on ? s.supportedLanguages.filter((x) => x !== l) : [...s.supportedLanguages, l])} className={`rounded-full border px-2.5 py-1 text-[11px] transition ${on ? "border-cyan/50 bg-cyan-soft text-cyan" : "border-line text-muted"}`}>{l}</button>;
                      })}
                    </div>
                  </Field>
                </div>
              </>
            )}

            {tab === "instructions" && (
              <>
                <Field label="System prompt" hint="Defines the agent's core role. Platform safety rules are always applied first and cannot be overridden.">
                  <textarea className="input font-mono text-[13px]" rows={10} maxLength={6000} value={s.systemPrompt} onChange={(e) => set("systemPrompt", e.target.value)} />
                  <div className="mt-1 text-right text-[11px] text-muted">{s.systemPrompt.length} / 6000</div>
                </Field>
                <Field label="Custom instructions" hint="Business rules, do's and don'ts, product facts, escalation paths…">
                  <textarea className="input" rows={6} maxLength={4000} value={s.customInstructions} onChange={(e) => set("customInstructions", e.target.value)} placeholder="e.g. Always recommend our Premium plan for teams over 10 people. Never discuss competitors' pricing." />
                </Field>
                <Field label="Response format">
                  <select className="input" value={s.responseFormat} onChange={(e) => set("responseFormat", e.target.value as "markdown" | "plain")}>
                    <option value="markdown">Rich markdown (headings, lists, code)</option>
                    <option value="plain">Plain text</option>
                  </select>
                </Field>
                <Row label="Hallucination reduction" hint="Instructs the agent to admit uncertainty rather than invent facts.">
                  <Switch checked={s.hallucinationGuard} onChange={(v) => set("hallucinationGuard", v)} label="Hallucination reduction" />
                </Row>
                <Field label="Fallback response" hint="Used when the agent can't answer reliably."><textarea className="input" rows={2} maxLength={500} value={s.fallbackMessage} onChange={(e) => set("fallbackMessage", e.target.value)} /></Field>
              </>
            )}

            {tab === "model" && (
              <>
                <Field label="Model" hint="Requests are routed server-side through the KRiXX AI gateway. Provider keys never reach the browser.">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {MODELS.map((m) => {
                      const avail = availability[m.id];
                      const locked = m.tier === "pro" && plan === "free";
                      return (
                        <button key={m.id} disabled={locked} onClick={() => set("model", m.id)} className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${s.model === m.id ? "border-violet bg-violet-soft ring-4 ring-violet-soft" : "border-line-strong hover:border-violet/40"}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{m.label}</span>
                            {locked ? <span className="badge border-warn/30 text-warn">Pro</span> : avail ? <span className="badge border-success/30 bg-success/10 text-success">Ready</span> : <span className="badge border-line-strong text-muted">Needs key</span>}
                          </div>
                          <div className="mt-1 text-[11px] text-muted">{PROVIDER_LABELS[m.provider].name}{m.provider !== "krixx" && ` · ${(m.context / 1000).toLocaleString()}K ctx`}</div>
                          <div className="mt-1.5 text-xs text-muted">{m.description}</div>
                          {!avail && !locked && <div className="mt-1.5 font-mono text-[10px] text-warn">Set {PROVIDER_LABELS[m.provider].env} — falls back to KRiXX Lite until configured</div>}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Fallback model" hint="Used automatically if the primary model errors or times out.">
                  <select className="input" value={s.fallbackModel ?? ""} onChange={(e) => set("fallbackModel", e.target.value || null)}>
                    <option value="">None</option>
                    {MODELS.filter((m) => m.id !== s.model && !(m.tier === "pro" && plan === "free")).map((m) => <option key={m.id} value={m.id}>{m.label}{availability[m.id] ? "" : " (needs key)"}</option>)}
                  </select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={`Max response tokens · ${s.maxTokens}`}><input type="range" min={64} max={4096} step={64} value={s.maxTokens} onChange={(e) => set("maxTokens", Number(e.target.value))} className="w-full accent-[var(--violet)]" aria-label="Max tokens" /></Field>
                  <Field label={`Context window · ${s.contextMessages} messages`}><input type="range" min={1} max={50} value={s.contextMessages} onChange={(e) => set("contextMessages", Number(e.target.value))} className="w-full accent-[var(--violet)]" aria-label="Context messages" /></Field>
                </div>
                <div className="rounded-xl border border-line bg-elevated/60 p-4 text-xs text-muted">
                  <div className="mb-1 font-medium text-fg">Tool permissions</div>
                  Knowledge search is the only tool currently available to agents (toggle it in Knowledge & Memory). Web, HTTP and workflow tools arrive with the Workflow Builder.
                </div>
              </>
            )}

            {tab === "knowledge" && (
              <>
                <Row label="Use knowledge base" hint="Retrieve relevant passages from your knowledge sources on every message.">
                  <Switch checked={s.useKnowledge} onChange={(v) => set("useKnowledge", v)} label="Use knowledge base" />
                </Row>
                <Field label={`Confidence threshold · ${s.knowledgeThreshold.toFixed(2)}`} hint="Higher = only use strongly matching passages.">
                  <input type="range" min={0} max={0.5} step={0.01} value={s.knowledgeThreshold} onChange={(e) => set("knowledgeThreshold", Number(e.target.value))} className="w-full accent-[var(--violet)]" disabled={!s.useKnowledge} aria-label="Confidence threshold" />
                </Field>
                <Link href="/dashboard/knowledge" className="btn-secondary w-fit"><Database className="size-4" /> Manage knowledge sources</Link>
                <hr className="border-line" />
                <Row label="Conversation memory" hint="Remember earlier messages within a conversation.">
                  <Switch checked={s.memoryEnabled} onChange={(v) => set("memoryEnabled", v)} label="Conversation memory" />
                </Row>
                <Field label={`Memory duration · ${s.memoryDays} days`} hint="Messages older than this are excluded from the agent's context.">
                  <input type="range" min={1} max={365} value={s.memoryDays} onChange={(e) => set("memoryDays", Number(e.target.value))} className="w-full accent-[var(--violet)]" disabled={!s.memoryEnabled} aria-label="Memory duration" />
                </Field>
              </>
            )}
          </div>
        </div>

        {/* Contextual preview panel */}
        <aside className="h-fit space-y-4 xl:sticky xl:top-20">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <AgentAvatar avatar={s.avatar} color={s.avatarColor} size={32} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{s.name}</div>
                <div className="flex items-center gap-1 text-[11px] text-success"><span className="size-1.5 rounded-full bg-success" /> Online</div>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="rounded-2xl rounded-tl-md bg-elevated px-3.5 py-2.5 text-sm">{s.welcomeMessage || "Hi! How can I help?"}</div>
              <div className="flex flex-wrap gap-1.5">
                {s.suggestedPrompts.map((p, i) => <span key={i} className="rounded-full border border-line-strong px-2.5 py-1 text-[11px]">{p}</span>)}
              </div>
            </div>
            <div className="border-t border-line p-3">
              <Link href={`/dashboard/agents/${id}/playground`} className="btn-primary w-full"><MessageSquare className="size-4" /> Chat with {s.name.split(" ")[0]}</Link>
            </div>
          </div>
          <div className="card space-y-2 p-4 text-xs">
            <div className="flex justify-between"><span className="text-muted">Model</span><span className="font-mono">{s.model}</span></div>
            <div className="flex justify-between"><span className="text-muted">Creativity</span><span>{creativity}</span></div>
            <div className="flex justify-between"><span className="text-muted">Memory</span><span>{s.memoryEnabled ? `${s.contextMessages} msgs · ${s.memoryDays}d` : "Off"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Knowledge</span><span>{s.useKnowledge ? "On" : "Off"}</span></div>
            {saved.status === "published" && saved.visibility === "public" && (
              <a href={`/agent/${slug}`} target="_blank" className="mt-2 block truncate font-mono text-cyan hover:underline">/agent/{slug}</a>
            )}
          </div>
          <DangerZone id={id} />
        </aside>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(92vw,520px)] items-center justify-between gap-3 rounded-2xl border border-line-strong bg-elevated/95 px-4 py-3 shadow-soft backdrop-blur animate-fade-up">
          <span className="text-sm"><Sliders className="mr-2 inline size-4 text-violet" />Unsaved changes</span>
          <div className="flex gap-2">
            <button className="btn-ghost btn-sm" onClick={() => setS(saved)}>Discard</button>
            <button className="btn-primary btn-sm" disabled={saving} onClick={() => save()}>{saving && <Loader2 className="size-3 animate-spin" />}Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DangerZone({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <button
      className="btn-danger w-full"
      onClick={async () => {
        if (!confirm("Delete this agent and all its conversations permanently?")) return;
        try {
          await api(`/api/agents/${id}`, { method: "DELETE" });
          toast("success", "Agent deleted");
          router.push("/dashboard/agents");
          router.refresh();
        } catch (e) {
          toast("error", errMsg(e));
        }
      }}
    >
      <Trash2 className="size-4" /> Delete agent
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
