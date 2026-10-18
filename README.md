# KRiXX AI — No-code AI Agent Platform

**Build. Train. Connect. Automate. Deploy.**

KRiXX AI is a full-stack SaaS for creating, training, testing and deploying AI agents without code. Built with Next.js (App Router), TypeScript, Tailwind CSS v4, PostgreSQL + Drizzle ORM, Zod and Recharts.

## What works today

| Module | Status |
| --- | --- |
| Landing, pricing, terms, privacy | ✅ |
| Auth: email/password, sessions, password reset, email verification, Google OAuth | ✅ (email/OAuth require env vars below) |
| Workspaces + roles (owner/admin/editor/viewer) | ✅ data model + server-side permission checks |
| Agent Studio — 12 presets, profile, personality, instructions, model, memory, knowledge settings | ✅ |
| Multi-model gateway — OpenAI, Anthropic, Gemini, OpenRouter, fallback model, timeouts, token tracking | ✅ |
| Streaming playground — markdown, code highlighting, copy, regenerate, clear, new, attachments, voice input, sources, debug mode | ✅ |
| Conversation persistence, history, deletion, memory window & retention | ✅ |
| Knowledge engine — paste text, .txt/.md/.csv upload, website URLs, chunking, ranked retrieval, citations, enable/disable, rename, re-index, agent scoping, confidence threshold | ✅ (PDF/DOCX + vector embeddings on roadmap) |
| Deployment — publish/unpublish, public pages `/agent/:slug`, regenerate link, widget customizer, live preview, embed script | ✅ |
| Analytics — messages, conversations, tokens, latency, failures, usage by agent, popular questions, date & agent filters | ✅ |
| Free plan limits (3 agents / 500 msgs / 5 sources) enforced in the backend, monthly reset, usage meters | ✅ |
| Security — scrypt hashing, hashed session tokens, Zod validation, rate limiting, request size limits, SSRF guard, prompt-injection defenses, moderation, abuse reports, audit logs, account deletion | ✅ |
| Workflow builder, third-party channel integrations, paid billing | 🚧 Clearly labeled "coming soon" — schema is ready |

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `OPENAI_API_KEY` | optional | Enables GPT models |
| `ANTHROPIC_API_KEY` | optional | Enables Claude models |
| `GEMINI_API_KEY` | optional | Enables Gemini models |
| `OPENROUTER_API_KEY` | optional | Enables OpenAI-compatible open models |
| `DEFAULT_MODEL` | optional | Default model id for new agents |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Google sign-in. Redirect URI: `{APP_URL}/api/auth/google-callback` |
| `RESEND_API_KEY` / `MAIL_FROM` | optional | Verification + password-reset emails |
| `APP_URL` | recommended | Public base URL used in emails, OAuth and widget code |

Without any LLM key, agents run on **KRiXX Lite**, a built-in offline engine that answers extractively from the knowledge base and clearly tells users that a full LLM isn't configured.

## Setup

```bash
npm install
cp .env.example .env   # set DATABASE_URL and optional keys
npx drizzle-kit push   # apply schema (src/db/schema.ts)
npm run dev
```

## Architecture

```
src/
  app/                 routes (marketing, /auth, /dashboard/*, /agent/[slug], /api/*)
  components/          design system + reusable UI (chat panel, shell, markdown, toasts)
  db/                  Drizzle schema + client
  lib/
    ai/catalog.ts      client-safe model catalog
    ai/gateway.ts      provider adapter interface + streaming adapters + fallback
    ai/prompt.ts       layered system prompt, injection defenses, moderation
    knowledge.ts       normalize → chunk → index → retrieve (Postgres FTS, GIN index)
    auth.ts            sessions, password hashing, workspace context, roles
    plans.ts           plan limits, usage metering, monthly periods
    api.ts             route handler wrapper, validation, rate limits, audit log
```

### Data isolation
This build uses a self-hosted Postgres rather than Supabase, so row-level isolation is enforced in the service layer: **every** query is scoped by the caller's workspace membership (`getOwnedAgent`, `owned()` helpers), and public endpoints only expose agents that are both `published` and `public`. Adding Postgres RLS policies on `workspace_id` is a drop-in hardening step when moving to Supabase.

### Adding a model provider
Implement `ProviderAdapter` in `src/lib/ai/gateway.ts`, register it in `ADAPTERS`, and add model entries to `MODELS` in `catalog.ts`.
