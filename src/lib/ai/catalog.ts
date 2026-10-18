/** Client-safe model catalog. Availability is resolved server-side from env vars. */
export type ProviderId = "openai" | "anthropic" | "gemini" | "openrouter" | "krixx";

export type ModelInfo = {
  id: string;
  label: string;
  provider: ProviderId;
  providerModel: string;
  context: number;
  tier: "free" | "pro";
  description: string;
};

export const PROVIDER_LABELS: Record<ProviderId, { name: string; env: string }> = {
  openai: { name: "OpenAI", env: "OPENAI_API_KEY" },
  anthropic: { name: "Anthropic", env: "ANTHROPIC_API_KEY" },
  gemini: { name: "Google Gemini", env: "GEMINI_API_KEY" },
  openrouter: { name: "OpenRouter (OpenAI-compatible)", env: "OPENROUTER_API_KEY" },
  krixx: { name: "KRiXX Built-in", env: "" },
};

export const MODELS: ModelInfo[] = [
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "openai", providerModel: "gpt-4o-mini", context: 128000, tier: "free", description: "Fast, affordable, strong all-rounder." },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai", providerModel: "gpt-4o", context: 128000, tier: "pro", description: "OpenAI flagship multimodal model." },
  { id: "claude-3-5-haiku", label: "Claude 3.5 Haiku", provider: "anthropic", providerModel: "claude-3-5-haiku-latest", context: 200000, tier: "free", description: "Quick and thoughtful responses." },
  { id: "claude-sonnet-4", label: "Claude Sonnet 4", provider: "anthropic", providerModel: "claude-sonnet-4-20250514", context: 200000, tier: "pro", description: "Excellent reasoning and writing." },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "gemini", providerModel: "gemini-2.0-flash", context: 1000000, tier: "free", description: "Huge context, very fast." },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", provider: "gemini", providerModel: "gemini-1.5-pro", context: 2000000, tier: "pro", description: "Google's long-context pro model." },
  { id: "llama-3.1-8b", label: "Llama 3.1 8B", provider: "openrouter", providerModel: "meta-llama/llama-3.1-8b-instruct", context: 128000, tier: "free", description: "Open model via OpenRouter." },
  { id: "krixx-lite", label: "KRiXX Lite (offline)", provider: "krixx", providerModel: "krixx-lite", context: 8000, tier: "free", description: "Built-in retrieval engine. Works with no API keys — answers from your knowledge base and templates, not a full LLM." },
];

export const getModel = (id: string) => MODELS.find((m) => m.id === id) ?? MODELS[MODELS.length - 1];
