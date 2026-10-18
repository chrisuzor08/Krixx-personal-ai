import "server-only";
import { getModel, MODELS, PROVIDER_LABELS, type ModelInfo, type ProviderId } from "./catalog";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type GenRequest = {
  system: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  signal?: AbortSignal;
  /** Used only by the offline engine. */
  context?: { snippets: { name: string; content: string }[]; fallback: string; welcome: string; agentName: string };
};
export type StreamChunk = { text?: string; usage?: { prompt: number; completion: number } };

export interface ProviderAdapter {
  id: ProviderId;
  isConfigured(): boolean;
  stream(model: ModelInfo, req: GenRequest): AsyncGenerator<StreamChunk>;
}

const TIMEOUT_MS = 60_000;

async function* sse(res: Response): AsyncGenerator<string> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line.startsWith("data:")) {
        const d = line.slice(5).trim();
        if (d && d !== "[DONE]") yield d;
      }
    }
  }
}

async function ensureOk(res: Response, provider: string) {
  if (res.ok) return;
  let detail = "";
  try {
    detail = (await res.text()).slice(0, 300);
  } catch {}
  console.error(`[ai:${provider}] ${res.status} ${detail}`);
  throw new Error(`${provider} returned HTTP ${res.status}`);
}

const withTimeout = (s?: AbortSignal) =>
  s ? AbortSignal.any([s, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS);

function openAICompatible(id: ProviderId, baseUrl: string, envKey: string): ProviderAdapter {
  return {
    id,
    isConfigured: () => !!process.env[envKey],
    async *stream(model, req) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: withTimeout(req.signal),
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env[envKey]}` },
        body: JSON.stringify({
          model: model.providerModel,
          stream: true,
          stream_options: { include_usage: true },
          temperature: req.temperature,
          max_tokens: req.maxTokens,
          messages: [{ role: "system", content: req.system }, ...req.messages],
        }),
      });
      await ensureOk(res, PROVIDER_LABELS[id].name);
      for await (const d of sse(res)) {
        const j = JSON.parse(d);
        const t = j.choices?.[0]?.delta?.content;
        if (t) yield { text: t };
        if (j.usage) yield { usage: { prompt: j.usage.prompt_tokens ?? 0, completion: j.usage.completion_tokens ?? 0 } };
      }
    },
  };
}

const anthropic: ProviderAdapter = {
  id: "anthropic",
  isConfigured: () => !!process.env.ANTHROPIC_API_KEY,
  async *stream(model, req) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: withTimeout(req.signal),
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model.providerModel,
        system: req.system,
        messages: req.messages,
        max_tokens: req.maxTokens,
        temperature: Math.min(req.temperature, 1),
        stream: true,
      }),
    });
    await ensureOk(res, "Anthropic");
    let prompt = 0;
    for await (const d of sse(res)) {
      const j = JSON.parse(d);
      if (j.type === "message_start") prompt = j.message?.usage?.input_tokens ?? 0;
      if (j.type === "content_block_delta" && j.delta?.text) yield { text: j.delta.text };
      if (j.type === "message_delta" && j.usage) yield { usage: { prompt, completion: j.usage.output_tokens ?? 0 } };
    }
  },
};

const gemini: ProviderAdapter = {
  id: "gemini",
  isConfigured: () => !!process.env.GEMINI_API_KEY,
  async *stream(model, req) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.providerModel}:streamGenerateContent?alt=sse`;
    const res = await fetch(url, {
      method: "POST",
      signal: withTimeout(req.signal),
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: req.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { temperature: req.temperature, maxOutputTokens: req.maxTokens },
      }),
    });
    await ensureOk(res, "Gemini");
    let usage: StreamChunk["usage"];
    for await (const d of sse(res)) {
      const j = JSON.parse(d);
      const parts = j.candidates?.[0]?.content?.parts ?? [];
      for (const p of parts) if (p.text) yield { text: p.text };
      if (j.usageMetadata)
        usage = { prompt: j.usageMetadata.promptTokenCount ?? 0, completion: j.usageMetadata.candidatesTokenCount ?? 0 };
    }
    if (usage) yield { usage };
  },
};

/** Offline engine: extractive answers from the knowledge base. No external LLM. */
const krixx: ProviderAdapter = {
  id: "krixx",
  isConfigured: () => true,
  async *stream(_model, req) {
    const last = req.messages[req.messages.length - 1]?.content ?? "";
    const ctx = req.context;
    let out: string;
    const terms = new Set(last.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
    if (/^\s*(hi|hello|hey|how far|good (morning|afternoon|evening)|yo)\b/i.test(last) && last.length < 40) {
      out = ctx?.welcome || `Hi! I'm ${ctx?.agentName ?? "your assistant"}. How can I help?`;
    } else if (ctx && ctx.snippets.length) {
      const sentences = ctx.snippets.flatMap((s) =>
        s.content.split(/(?<=[.!?])\s+/).map((t) => ({ t: t.trim(), name: s.name }))
      );
      const scored = sentences
        .map((s) => ({ ...s, score: (s.t.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((w) => terms.has(w)).length }))
        .filter((s) => s.score > 0 && s.t.length > 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
      out = scored.length
        ? `Here's what I found in my knowledge base:\n\n${scored.map((s) => `- ${s.t}`).join("\n")}\n\n_Source: ${[...new Set(scored.map((s) => s.name))].join(", ")}_`
        : ctx.fallback;
    } else {
      out = `${ctx?.fallback ?? "I'm not sure about that."}\n\n> ℹ️ This agent is running on **KRiXX Lite**, the built-in offline engine, which only answers from connected knowledge. Connect an LLM provider (e.g. \`OPENAI_API_KEY\`) and pick a model in the agent's AI settings for full conversational intelligence.`;
    }
    const words = out.split(/(\s+)/);
    for (const w of words) {
      if (req.signal?.aborted) return;
      yield { text: w };
      await new Promise((r) => setTimeout(r, 12));
    }
    yield { usage: { prompt: estimateTokens(req.system + last), completion: estimateTokens(out) } };
  },
};

export const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  openai: openAICompatible("openai", "https://api.openai.com/v1", "OPENAI_API_KEY"),
  openrouter: openAICompatible("openrouter", "https://openrouter.ai/api/v1", "OPENROUTER_API_KEY"),
  anthropic,
  gemini,
  krixx,
};

export const estimateTokens = (s: string) => Math.ceil(s.length / 4);

export function isModelAvailable(id: string) {
  const m = MODELS.find((x) => x.id === id);
  return !!m && ADAPTERS[m.provider].isConfigured();
}

export function modelAvailability() {
  return Object.fromEntries(MODELS.map((m) => [m.id, ADAPTERS[m.provider].isConfigured()])) as Record<string, boolean>;
}

/** Streams from the primary model; if it fails before emitting text, falls back to the fallback model. */
export async function* generate(
  modelId: string,
  fallbackId: string | null | undefined,
  req: GenRequest
): AsyncGenerator<StreamChunk & { model?: string; fellBack?: string }> {
  const chain = [modelId, fallbackId].filter((x): x is string => !!x && isModelAvailable(x));
  if (!chain.length) chain.push("krixx-lite");
  let lastErr: unknown;
  for (const id of chain) {
    const model = getModel(id);
    let emitted = false;
    try {
      yield { model: model.id, fellBack: id !== modelId ? lastErr instanceof Error ? lastErr.message : "unavailable" : undefined };
      for await (const c of ADAPTERS[model.provider].stream(model, req)) {
        if (c.text) emitted = true;
        yield c;
      }
      return;
    } catch (e) {
      lastErr = e;
      if (emitted || req.signal?.aborted) throw e;
    }
  }
  throw lastErr ?? new Error("No model available");
}
