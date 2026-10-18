import Link from "next/link";
import { ArrowRight, Bot, BrainCircuit, Database, FileText, Globe, Layers, LineChart, Lock, MessageSquare, Rocket, Shield, Sparkles, Workflow, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PricingCards, SiteFooter, SiteHeader } from "@/components/marketing";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: Bot, title: "12 personality presets", text: "Support, tutoring, sales, coding, Pidgin companion and more — each with a tuned system prompt you can customize." },
  { icon: BrainCircuit, title: "Multi-model engine", text: "Swap between OpenAI, Gemini, Anthropic and open models through one gateway, with automatic fallback." },
  { icon: MessageSquare, title: "Streaming playground", text: "Test in real time with markdown, code highlighting, voice input, attachments and a full debug inspector." },
  { icon: Layers, title: "Conversation memory", text: "Configurable context windows and retention, with user-controlled history deletion." },
  { icon: Shield, title: "Guardrails built in", text: "Prompt-injection defenses, hallucination reduction, moderation and abuse reporting by default." },
  { icon: LineChart, title: "Analytics", text: "Messages, tokens, latency, failure rates and popular questions — per agent." },
];

const INTEGRATIONS = [
  { name: "Website widget", live: true },
  { name: "Public share link", live: true },
  { name: "WhatsApp", live: false },
  { name: "Telegram", live: false },
  { name: "Discord", live: false },
  { name: "Instagram", live: false },
  { name: "Gmail", live: false },
  { name: "Google Sheets", live: false },
  { name: "Google Calendar", live: false },
  { name: "Notion", live: false },
  { name: "Webhooks", live: false },
  { name: "Zapier · n8n", live: false },
];

const FAQ = [
  ["Is KRiXX AI really free?", "Yes. The Free plan includes 3 agents, 500 messages per month and 5 knowledge sources with no credit card. Limits reset on the 1st of every month."],
  ["Do I need to know how to code?", "No. Pick a template, customize your agent's personality and knowledge with forms and toggles, and share it with a link or embed snippet."],
  ["Which AI models can I use?", "KRiXX routes requests through a provider-agnostic gateway supporting OpenAI, Google Gemini, Anthropic and OpenAI-compatible providers. A built-in offline engine is available when no provider is configured."],
  ["Is my data private?", "Your agents, knowledge and conversations are scoped to your workspace and never shared with other users. Provider API keys stay on the server."],
  ["Can my agent answer from my own documents?", "Yes. Add text, Markdown, CSV files or website URLs. KRiXX chunks and indexes them, then retrieves relevant passages and cites them in answers."],
];

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <div className="overflow-x-clip">
      <SiteHeader authed={!!user} />

      {/* Hero */}
      <section className="relative">
        <div className="grid-bg pointer-events-none absolute inset-0 -z-10 opacity-70" />
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]" style={{ background: "radial-gradient(closest-side, var(--violet), transparent), radial-gradient(closest-side, var(--cyan), transparent)" }} />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
          <span className="badge animate-fade-up border-violet/30 bg-violet-soft text-violet">
            <Sparkles className="size-3" /> No-code AI agent platform
          </span>
          <h1 className="animate-fade-up mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-7xl">
            <span className="gradient-text">Your Ideas. Your AI.</span>
            <br />
            Your Rules.
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-base text-muted sm:text-lg">
            Create intelligent AI agents, connect your knowledge, automate workflows, and deploy everywhere — without writing a single line of code.
          </p>
          <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={user ? "/dashboard/agents/new" : "/auth?mode=signup"} className="btn-primary h-12 px-6 text-[15px]">
              Start Building Free <ArrowRight className="size-4" />
            </Link>
            <Link href="#features" className="btn-secondary h-12 px-6 text-[15px]">Explore AI Agents</Link>
          </div>
          <p className="mt-4 text-xs text-muted">Free forever plan · No credit card required</p>

          {/* Product preview */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="card glow overflow-hidden text-left">
              <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
                <span className="size-2.5 rounded-full bg-[#ff5f57]" /><span className="size-2.5 rounded-full bg-[#febc2e]" /><span className="size-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 font-mono text-[11px] text-muted">krixx.ai/dashboard/agents/support-pro</span>
              </div>
              <div className="grid md:grid-cols-[1fr_1.2fr]">
                <div className="space-y-4 border-b border-line p-5 md:border-b-0 md:border-r">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted">Agent Studio</div>
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-cyan-soft text-xl">🎧</span>
                    <div><div className="font-medium">Nova Support</div><div className="text-xs text-muted">Customer Support Agent</div></div>
                  </div>
                  {[["Personality", "Patient, empathetic"], ["Model", "GPT-4o mini → Gemini fallback"], ["Knowledge", "3 sources · 128 chunks"]].map(([k, v]) => (
                    <div key={k}><div className="label">{k}</div><div className="rounded-lg border border-line bg-elevated px-3 py-2 text-sm">{v}</div></div>
                  ))}
                  <div>
                    <div className="label">Creativity</div>
                    <div className="h-1.5 rounded-full bg-elevated"><div className="h-full w-[35%] rounded-full" style={{ background: "linear-gradient(90deg,var(--violet),var(--cyan))" }} /></div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-5 text-sm">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted">Live preview</div>
                  <div className="self-end rounded-2xl rounded-br-md bg-violet px-4 py-2 text-white">How long do refunds take?</div>
                  <div className="flex gap-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-cyan-soft text-sm">🎧</span>
                    <div>
                      <p>Refunds are processed within <b>5–7 business days</b> after we receive your return. You&apos;ll get an email confirmation once it&apos;s issued.</p>
                      <span className="badge mt-2 border-cyan/25 bg-cyan-soft text-cyan"><FileText className="size-3" /> refund-policy.md</span>
                    </div>
                  </div>
                  <div className="self-end rounded-2xl rounded-br-md bg-violet px-4 py-2 text-white">Can I get store credit instead?</div>
                  <div className="typing flex items-center gap-1 pl-10"><span className="size-1.5 rounded-full bg-muted" /><span className="size-1.5 rounded-full bg-muted" /><span className="size-1.5 rounded-full bg-muted" /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionTitle eyebrow="How it works" title="From idea to deployed agent in minutes" />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { icon: Bot, n: "01", t: "Create", d: "Pick a preset or start from scratch. Shape personality, tone, language and instructions." },
            { icon: Database, n: "02", t: "Train", d: "Connect documents, CSVs and websites. Your agent answers from your knowledge, with citations." },
            { icon: Rocket, n: "03", t: "Deploy", d: "Publish a shareable page or embed a chat widget on any website with one snippet." },
          ].map((s) => (
            <div key={s.n} className="card p-6">
              <div className="flex items-center justify-between">
                <s.icon className="size-5 text-violet" />
                <span className="font-mono text-xs text-muted">{s.n}</span>
              </div>
              <h3 className="mt-6 text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <SectionTitle eyebrow="AI Agent Studio" title="Everything you need to build agents people love" />
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-surface p-6 transition hover:bg-elevated">
              <f.icon className="size-5 text-cyan" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Knowledge + Automation */}
      <section id="knowledge" className="mx-auto grid max-w-6xl scroll-mt-20 gap-5 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div className="card p-8">
          <Database className="size-6 text-violet" />
          <h3 className="mt-5 text-2xl font-semibold tracking-tight">Knowledge Intelligence</h3>
          <p className="mt-2 text-muted">Retrieval-augmented generation that grounds every answer in your content — and admits when it doesn&apos;t know.</p>
          <ol className="mt-6 space-y-2 text-sm">
            {["Upload text, Markdown, CSV or a website URL", "Clean, normalize and split into semantic chunks", "Index for ranked retrieval", "Inject relevant context as untrusted reference data", "Answer with source citations"].map((s, i) => (
              <li key={s} className="flex gap-3"><span className="font-mono text-xs text-cyan">0{i + 1}</span>{s}</li>
            ))}
          </ol>
        </div>
        <div className="card p-8">
          <Workflow className="size-6 text-cyan" />
          <h3 className="mt-5 text-2xl font-semibold tracking-tight">Visual Automation</h3>
          <p className="mt-2 text-muted">A drag-and-drop canvas to chain AI agents, conditions, HTTP requests, webhooks and human approvals.</p>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            {["Trigger", "AI Agent", "Condition", "HTTP Request", "Human Approval", "End"].map((n, i, a) => (
              <span key={n} className="flex items-center gap-2">
                <span className="rounded-lg border border-line-strong bg-elevated px-2.5 py-1.5">{n}</span>
                {i < a.length - 1 && <ArrowRight className="size-3 text-muted" />}
              </span>
            ))}
          </div>
          <span className="badge mt-6 border-warn/30 bg-warn/10 text-warn">On the roadmap — Phase 5</span>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <SectionTitle eyebrow="Integrations & deployment" title="Deploy where your users are" />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {INTEGRATIONS.map((i) => (
            <div key={i.name} className="card flex items-center justify-between px-4 py-3.5 text-sm">
              <span className="flex items-center gap-2">{i.live ? <Globe className="size-4 text-cyan" /> : <Zap className="size-4 text-muted" />}{i.name}</span>
              <span className={`badge ${i.live ? "border-success/30 bg-success/10 text-success" : "border-line-strong text-muted"}`}>{i.live ? "Live" : "Soon"}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="card p-6">
            <h3 className="font-semibold">Public agent pages</h3>
            <p className="mt-1.5 text-sm text-muted">Every published agent gets a beautiful, mobile-ready page at <span className="font-mono text-cyan">/agent/your-agent</span>.</p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold">Website chat widget</h3>
            <p className="mt-1.5 text-sm text-muted">Customize colors, position and greeting, then paste one script tag into your site.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <SectionTitle eyebrow="Pricing" title="Free to start. Genuinely." />
        <div className="mt-12"><PricingCards /></div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
        <SectionTitle eyebrow="FAQ" title="Questions, answered" />
        <div className="mt-10 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between font-medium">
                {q}<span className="text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="card glow relative overflow-hidden px-6 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 opacity-25" style={{ background: "radial-gradient(60% 80% at 50% 0%, var(--violet), transparent)" }} />
          <Lock className="mx-auto size-6 text-violet" />
          <h2 className="relative mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Build your first agent today.</h2>
          <p className="relative mx-auto mt-4 max-w-lg text-muted">Join creators, students and businesses shipping AI assistants with KRiXX.</p>
          <Link href={user ? "/dashboard" : "/auth?mode=signup"} className="btn-primary relative mt-8 h-12 px-6">Start Building Free <ArrowRight className="size-4" /></Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">{eyebrow}</div>
      <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
    </div>
  );
}
