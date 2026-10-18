"use client";
import { ArrowUp, Bug, Check, Copy, FileText, Flag, Mic, MicOff, Paperclip, RotateCcw, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "./markdown";
import { useToast } from "./toast";
import { AgentAvatar } from "./ui";

export type Source = { sourceId: string; name: string; snippet: string; score: number };
export type Debug = {
  model: string;
  requestedModel: string;
  fellBack?: string;
  usage: { prompt: number; completion: number };
  latencyMs: number;
  chunks: (Source & { content: string })[];
  systemPromptChars: number;
  historyMessages: number;
  toolCalls: unknown[];
};
export type UIMessage = { id: string; role: "user" | "assistant"; content: string; sources?: Source[] | null; debug?: Debug; error?: string | null; model?: string | null };

type Props = {
  agent: { name: string; avatar: string; avatarColor: string; welcomeMessage: string; suggestedPrompts: string[] };
  agentId?: string;
  slug?: string;
  conversationId?: string | null;
  initialMessages?: UIMessage[];
  onConversation?: (id: string) => void;
  onDone?: () => void;
  debug?: boolean;
  modelOverride?: string;
  accent?: string;
  compact?: boolean;
};

type SpeechRec = { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

export function ChatPanel(p: Props) {
  const toast = useToast();
  const [msgs, setMsgs] = useState<UIMessage[]>(p.initialMessages ?? []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [convId, setConvId] = useState<string | null>(p.conversationId ?? null);
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);
  const [listening, setListening] = useState(false);
  const [openDebug, setOpenDebug] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [visitorId] = useState(() => {
    if (typeof window === "undefined" || !p.slug) return undefined;
    let v = localStorage.getItem("krixx-visitor");
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem("krixx-visitor", v);
    }
    return v;
  });

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs, busy]);

  const accent = p.accent ?? "var(--violet)";

  async function send(text: string, regenerate = false) {
    if (busy || (!text.trim() && !regenerate)) return;
    setBusy(true);
    const assistantId = `a-${Date.now()}`;
    setMsgs((m) => {
      let next = [...m];
      if (regenerate) {
        if (next[next.length - 1]?.role === "assistant") next = next.slice(0, -1);
      } else next.push({ id: `u-${Date.now()}`, role: "user", content: attachment ? `${text}\n\n📎 ${attachment.name}` : text });
      return [...next, { id: assistantId, role: "assistant", content: "" }];
    });
    setInput("");
    const att = attachment;
    setAttachment(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const patch = (fn: (m: UIMessage) => UIMessage) => setMsgs((all) => all.map((m) => (m.id === assistantId ? fn(m) : m)));
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: p.agentId, slug: p.slug, conversationId: convId, message: text || "regenerate", attachment: att, regenerate, visitorId, modelOverride: p.modelOverride }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Request failed");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === "meta") {
            if (ev.conversationId !== convId) {
              setConvId(ev.conversationId);
              p.onConversation?.(ev.conversationId);
            }
            patch((m) => ({ ...m, sources: ev.sources }));
          } else if (ev.type === "delta") patch((m) => ({ ...m, content: m.content + ev.text }));
          else if (ev.type === "done") patch((m) => ({ ...m, id: ev.messageId ?? m.id, debug: ev.debug, model: ev.debug?.model }));
          else if (ev.type === "error") {
            patch((m) => ({ ...m, error: ev.error }));
            toast("error", ev.error);
          }
        }
      }
      p.onDone?.();
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Something went wrong";
      patch((m) => ({ ...m, error: msg }));
      toast("error", msg);
    } finally {
      setBusy(false);
      abortRef.current = null;
      taRef.current?.focus();
    }
  }

  function onFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 60_000) return toast("error", "Attachments must be under 60 KB of text.");
    if (!/\.(txt|md|csv|json|log|html|xml|ya?ml|js|ts|py)$/i.test(f.name)) return toast("error", "Attach text-based files (txt, md, csv, json, code).");
    f.text().then((content) => setAttachment({ name: f.name, content }));
  }

  function toggleVoice() {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return toast("info", "Voice input isn't supported in this browser.");
    if (listening) return recRef.current?.stop();
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => setInput((v) => (v ? v + " " : "") + e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function report(messageId: string) {
    const reason = window.prompt("Report this response — what's wrong? (harmful, inaccurate, spam, privacy, other)", "inaccurate")?.trim().toLowerCase();
    if (!reason) return;
    const valid = ["harmful", "inaccurate", "spam", "privacy", "other"].includes(reason) ? reason : "other";
    const res = await fetch("/api/account?action=report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: p.slug, agentId: p.agentId, messageId: /^[0-9a-f-]{36}$/.test(messageId) ? messageId : undefined, reason: valid, details: reason }),
    });
    toast(res.ok ? "success" : "error", res.ok ? "Thanks — report submitted." : "Couldn't submit report.");
  }

  const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5" aria-live="polite">
        <div className={`mx-auto flex flex-col gap-5 ${p.compact ? "" : "max-w-3xl"}`}>
          {/* Welcome */}
          <div className="flex gap-3">
            <AgentAvatar avatar={p.agent.avatar} color={p.agent.avatarColor} size={32} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-xs font-medium text-muted">{p.agent.name}</div>
              <div className="prose-chat">{p.agent.welcomeMessage || "Hi! How can I help?"}</div>
              {msgs.length === 0 && p.agent.suggestedPrompts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.agent.suggestedPrompts.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border border-line-strong bg-elevated px-3 py-1.5 text-xs transition hover:border-violet/60 hover:text-fg">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {msgs.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end animate-fade-up">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md px-4 py-2.5 text-[14.5px] text-white" style={{ background: accent }}>
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="group flex gap-3 animate-fade-up">
                <AgentAvatar avatar={p.agent.avatar} color={p.agent.avatarColor} size={32} />
                <div className="min-w-0 flex-1">
                  {m.content ? (
                    <Markdown text={m.content} />
                  ) : !m.error ? (
                    <div className="typing flex h-6 items-center gap-1" aria-label="Assistant is typing">
                      <span className="size-1.5 rounded-full bg-muted" />
                      <span className="size-1.5 rounded-full bg-muted" />
                      <span className="size-1.5 rounded-full bg-muted" />
                    </div>
                  ) : null}
                  {m.error && <div className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{m.error}</div>}
                  {m.sources && m.sources.length > 0 && m.content && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {[...new Map(m.sources.map((s) => [s.sourceId, s])).values()].map((s) => (
                        <span key={s.sourceId} className="badge border-cyan/25 bg-cyan-soft text-cyan" title={s.snippet}>
                          <FileText className="size-3" /> {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.content && !(busy && m.id === lastAssistant?.id) && (
                    <div className="mt-1.5 flex items-center gap-0.5 opacity-70 transition group-hover:opacity-100">
                      <button
                        className="btn-ghost btn-sm !h-7 !px-2"
                        onClick={() => {
                          navigator.clipboard.writeText(m.content);
                          setCopied(m.id);
                          setTimeout(() => setCopied(null), 1500);
                        }}
                        aria-label="Copy response"
                      >
                        {copied === m.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      </button>
                      {m.id === lastAssistant?.id && (
                        <button className="btn-ghost btn-sm !h-7 !px-2" onClick={() => send("", true)} aria-label="Regenerate response">
                          <RotateCcw className="size-3.5" />
                        </button>
                      )}
                      {p.debug && m.debug && (
                        <button className={`btn-ghost btn-sm !h-7 !px-2 ${openDebug === m.id ? "!text-cyan" : ""}`} onClick={() => setOpenDebug(openDebug === m.id ? null : m.id)} aria-label="Debug info">
                          <Bug className="size-3.5" />
                        </button>
                      )}
                      {p.slug && (
                        <button className="btn-ghost btn-sm !h-7 !px-2" onClick={() => report(m.id)} aria-label="Report response">
                          <Flag className="size-3.5" />
                        </button>
                      )}
                      {m.model && p.debug && <span className="ml-1 font-mono text-[10px] text-muted">{m.model}</span>}
                    </div>
                  )}
                  {p.debug && openDebug === m.id && m.debug && <DebugView d={m.debug} />}
                </div>
              </div>
            )
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-line bg-surface/60 px-3 py-3 backdrop-blur sm:px-5">
        <div className={`mx-auto ${p.compact ? "" : "max-w-3xl"}`}>
          {attachment && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-line-strong bg-elevated px-2.5 py-1 text-xs">
              <Paperclip className="size-3" /> {attachment.name}
              <button onClick={() => setAttachment(null)} aria-label="Remove attachment">
                <X className="size-3" />
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 rounded-2xl border border-line-strong bg-bg/70 p-1.5 transition focus-within:border-violet"
          >
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))} />
            <button type="button" className="btn-ghost btn-sm !h-9 !px-2" onClick={() => fileRef.current?.click()} aria-label="Attach file">
              <Paperclip className="size-4" />
            </button>
            <textarea
              ref={taRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={`Message ${p.agent.name}…`}
              aria-label="Message"
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-[14.5px] outline-none placeholder:text-muted/70"
              maxLength={8000}
            />
            <button type="button" className={`btn-ghost btn-sm !h-9 !px-2 ${listening ? "!text-danger" : ""}`} onClick={toggleVoice} aria-label="Voice input">
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>
            {busy ? (
              <button type="button" onClick={() => abortRef.current?.abort()} className="grid size-9 place-items-center rounded-xl bg-elevated" aria-label="Stop generating">
                <Square className="size-3.5 fill-current" />
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} className="grid size-9 place-items-center rounded-xl text-white transition disabled:opacity-40" style={{ background: accent }} aria-label="Send">
                <ArrowUp className="size-4" />
              </button>
            )}
          </form>
          <p className="mt-1.5 text-center text-[10.5px] text-muted">AI can make mistakes. Verify important information.</p>
        </div>
      </div>
    </div>
  );
}

function DebugView({ d }: { d: Debug }) {
  return (
    <div className="mt-2 space-y-3 rounded-xl border border-cyan/25 bg-cyan-soft/40 p-3 font-mono text-[11.5px]">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        <div><span className="text-muted">model</span> {d.model}</div>
        <div><span className="text-muted">latency</span> {d.latencyMs}ms</div>
        <div><span className="text-muted">tokens</span> {d.usage.prompt}+{d.usage.completion}</div>
        <div><span className="text-muted">history</span> {d.historyMessages} msgs</div>
        <div><span className="text-muted">system</span> {d.systemPromptChars} chars</div>
        <div><span className="text-muted">tools</span> {d.toolCalls.length ? JSON.stringify(d.toolCalls) : "none"}</div>
      </div>
      {d.fellBack && <div className="text-warn">⚠ requested {d.requestedModel} → fell back ({d.fellBack})</div>}
      <div>
        <div className="mb-1 text-muted">retrieved chunks ({d.chunks.length})</div>
        {d.chunks.length === 0 ? (
          <div className="text-muted">— none above threshold —</div>
        ) : (
          d.chunks.map((c, i) => (
            <details key={i} className="mb-1 rounded-lg bg-bg/60 p-2">
              <summary className="cursor-pointer">
                [{i + 1}] {c.name} · score {c.score}
              </summary>
              <p className="mt-1 whitespace-pre-wrap font-sans text-xs text-muted">{c.content}</p>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
