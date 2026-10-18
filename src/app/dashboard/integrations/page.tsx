import { CheckCircle2, CircleDashed, Code2, Globe, KeyRound, Link2 } from "lucide-react";
import Link from "next/link";
import { requirePageCtx } from "@/lib/auth";
import { ADAPTERS } from "@/lib/ai/gateway";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/ai/catalog";
import { emailConfigured } from "@/lib/mail";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Integrations" };

const SOON: { group: string; items: { name: string; desc: string; perms: string }[] }[] = [
  { group: "Communication", items: [
    { name: "WhatsApp", desc: "Answer customers on WhatsApp Business via the Cloud API.", perms: "Send & receive messages on a connected business number" },
    { name: "Telegram", desc: "Connect a Telegram bot token to deploy your agent as a bot.", perms: "Read messages sent to your bot, reply as the bot" },
    { name: "Discord", desc: "Add your agent to Discord servers as a slash-command bot.", perms: "Read messages in permitted channels, reply" },
    { name: "Instagram", desc: "Reply to Instagram DMs automatically.", perms: "Read & reply to direct messages" },
  ] },
  { group: "Productivity", items: [
    { name: "Gmail", desc: "Draft and send emails from workflows.", perms: "Send email on your behalf (OAuth)" },
    { name: "Google Calendar", desc: "Let agents check availability and book meetings.", perms: "Read free/busy, create events (OAuth)" },
    { name: "Google Sheets", desc: "Log leads or read data from spreadsheets.", perms: "Read/write selected spreadsheets (OAuth)" },
    { name: "Notion", desc: "Sync Notion pages into your knowledge base.", perms: "Read pages you share with the integration" },
  ] },
  { group: "Automation", items: [
    { name: "Webhooks", desc: "Trigger external systems on agent events.", perms: "POST event payloads to your URL" },
    { name: "REST APIs", desc: "Call any HTTP API from workflow nodes.", perms: "Outbound HTTPS requests you configure" },
    { name: "Zapier", desc: "Connect to 6,000+ apps through Zapier.", perms: "Zapier triggers & actions" },
    { name: "n8n", desc: "Use KRiXX agents inside self-hosted n8n flows.", perms: "API key scoped to your workspace" },
  ] },
];

export default async function IntegrationsPage() {
  await requirePageCtx();
  const providers = (Object.keys(PROVIDER_LABELS) as ProviderId[]).filter((p) => p !== "krixx");
  return (
    <div className="animate-fade-up space-y-10">
      <PageHeader title="Integration Hub" description="Connect KRiXX to your channels, tools and AI providers. Only integrations with a working backend are shown as available." />

      <section>
        <h2 className="label mb-3">Live channels</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { icon: Globe, name: "Website chat widget", desc: "Embed your agent on any site with a single script tag.", href: "/dashboard/deployments" },
            { icon: Link2, name: "Public share link", desc: "A hosted, mobile-ready chat page for every published agent.", href: "/dashboard/deployments" },
          ].map((i) => (
            <div key={i.name} className="card flex items-start gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-soft text-violet"><i.icon className="size-5" /></span>
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">{i.name}<span className="badge border-success/30 bg-success/10 text-success"><CheckCircle2 className="size-3" /> Available</span></div>
                <p className="mt-1 text-sm text-muted">{i.desc}</p>
                <Link href={i.href} className="btn-secondary btn-sm mt-3">Configure</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="label mb-3">AI providers & services (server-side configuration)</h2>
        <div className="card divide-y divide-line">
          {providers.map((p) => {
            const ok = ADAPTERS[p].isConfigured();
            return (
              <div key={p} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3"><KeyRound className="size-4 text-cyan" /><div><div className="text-sm font-medium">{PROVIDER_LABELS[p].name}</div><div className="font-mono text-[11px] text-muted">{PROVIDER_LABELS[p].env}</div></div></div>
                {ok ? <span className="badge border-success/30 bg-success/10 text-success"><CheckCircle2 className="size-3" /> Connected</span> : <span className="badge border-line-strong text-muted"><CircleDashed className="size-3" /> Not configured</span>}
              </div>
            );
          })}
          <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3"><KeyRound className="size-4 text-cyan" /><div><div className="text-sm font-medium">Transactional email (Resend)</div><div className="font-mono text-[11px] text-muted">RESEND_API_KEY</div></div></div>
            {emailConfigured() ? <span className="badge border-success/30 bg-success/10 text-success">Connected</span> : <span className="badge border-line-strong text-muted">Not configured</span>}
          </div>
          <div className="flex items-center gap-3 p-4 text-xs text-muted"><Code2 className="size-4" /> Provider keys are read from server environment variables and never sent to the browser. See README for setup.</div>
        </div>
      </section>

      {SOON.map((g) => (
        <section key={g.group}>
          <h2 className="label mb-3">{g.group}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {g.items.map((i) => (
              <div key={i.name} className="card flex flex-col p-5 opacity-90">
                <div className="flex items-center justify-between"><span className="font-medium">{i.name}</span><span className="badge border-warn/30 bg-warn/10 text-warn">Coming soon</span></div>
                <p className="mt-2 flex-1 text-sm text-muted">{i.desc}</p>
                <p className="mt-3 text-[11px] text-muted"><b>Permissions:</b> {i.perms}</p>
                <button disabled className="btn-secondary btn-sm mt-4 w-full">Connect — not yet available</button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
