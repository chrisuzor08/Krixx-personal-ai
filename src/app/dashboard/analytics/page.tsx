import { and, avg, count, countDistinct, desc, eq, gte, sql, sum } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { agents, conversations, messages, usageRecords } from "@/db/schema";
import { requirePageCtx } from "@/lib/auth";
import { PageHeader, StatCard } from "@/components/page-header";
import { Charts } from "./charts";

export const metadata = { title: "Analytics" };

const RANGES = [7, 30, 90];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string; agent?: string }> }) {
  const ctx = await requirePageCtx();
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.range)) ? Number(sp.range) : 30;
  const since = new Date(Date.now() - days * 86400_000);
  const ws = ctx.workspace.id;
  const agentFilter = sp.agent && /^[0-9a-f-]{36}$/i.test(sp.agent) ? sp.agent : null;

  const convWhere = and(eq(conversations.workspaceId, ws), agentFilter ? eq(conversations.agentId, agentFilter) : undefined);
  const usageWhere = and(eq(usageRecords.workspaceId, ws), gte(usageRecords.createdAt, since), agentFilter ? eq(usageRecords.agentId, agentFilter) : undefined);
  const day = (col: typeof messages.createdAt | typeof conversations.createdAt | typeof usageRecords.createdAt) => sql<string>`to_char(date_trunc('day', ${col}), 'YYYY-MM-DD')`;

  const [msgDaily, convDaily, usageDaily, [totals], byAgent, popular, agentList, [activeAgents]] = await Promise.all([
    db.select({ d: day(messages.createdAt), c: count() }).from(messages).innerJoin(conversations, eq(conversations.id, messages.conversationId)).where(and(convWhere, gte(messages.createdAt, since))).groupBy(sql`1`).orderBy(sql`1`),
    db.select({ d: day(conversations.createdAt), c: count() }).from(conversations).where(and(convWhere, gte(conversations.createdAt, since))).groupBy(sql`1`).orderBy(sql`1`),
    db.select({ d: day(usageRecords.createdAt), tokens: sum(usageRecords.tokens), failed: sql<number>`count(*) filter (where ${usageRecords.success} = false)`, latency: avg(usageRecords.latencyMs) }).from(usageRecords).where(usageWhere).groupBy(sql`1`).orderBy(sql`1`),
    db.select({ tokens: sum(usageRecords.tokens), latency: avg(usageRecords.latencyMs), ok: sql<number>`count(*) filter (where ${usageRecords.success})`, failed: sql<number>`count(*) filter (where ${usageRecords.success} = false)` }).from(usageRecords).where(usageWhere),
    db.select({ name: agents.name, c: count(), tokens: sum(usageRecords.tokens) }).from(usageRecords).innerJoin(agents, eq(agents.id, usageRecords.agentId)).where(and(usageWhere, eq(usageRecords.success, true))).groupBy(agents.name).orderBy(desc(count())).limit(8),
    db.select({ q: sql<string>`lower(left(${messages.content}, 80))`, c: count() }).from(messages).innerJoin(conversations, eq(conversations.id, messages.conversationId)).where(and(convWhere, eq(messages.role, "user"), gte(messages.createdAt, since))).groupBy(sql`1`).orderBy(desc(count())).limit(8),
    db.select({ id: agents.id, name: agents.name }).from(agents).where(eq(agents.workspaceId, ws)),
    db.select({ c: countDistinct(conversations.agentId) }).from(conversations).where(and(convWhere, gte(conversations.updatedAt, since))),
  ]);

  // Build a continuous day series
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400_000).toISOString().slice(0, 10);
    const u = usageDaily.find((x) => x.d === d);
    return {
      date: d.slice(5),
      messages: msgDaily.find((x) => x.d === d)?.c ?? 0,
      conversations: convDaily.find((x) => x.d === d)?.c ?? 0,
      tokens: Number(u?.tokens ?? 0),
      failed: Number(u?.failed ?? 0),
      latency: Math.round(Number(u?.latency ?? 0)),
    };
  });
  const total = Number(totals.ok) + Number(totals.failed);
  const qs = (r: number, a?: string | null) => `?range=${r}${a ? `&agent=${a}` : ""}`;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Analytics"
        description="Monitor conversations, usage and performance."
        actions={
          <>
            <div className="flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="Date range">
              {RANGES.map((r) => (
                <Link key={r} href={qs(r, agentFilter)} className={`rounded-lg px-3 py-1.5 text-xs transition ${r === days ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}>{r}d</Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1" role="group" aria-label="Agent filter">
              <Link href={qs(days)} className={`rounded-lg px-3 py-1.5 text-xs ${!agentFilter ? "bg-elevated" : "text-muted"}`}>All agents</Link>
              {agentList.slice(0, 4).map((a) => (
                <Link key={a.id} href={qs(days, a.id)} className={`max-w-32 truncate rounded-lg px-3 py-1.5 text-xs ${agentFilter === a.id ? "bg-elevated" : "text-muted"}`}>{a.name}</Link>
              ))}
            </div>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Messages" value={series.reduce((a, b) => a + b.messages, 0)} hint={`Last ${days} days`} />
        <StatCard label="Conversations" value={series.reduce((a, b) => a + b.conversations, 0)} />
        <StatCard label="Active agents" value={activeAgents.c} />
        <StatCard label="Avg response" value={`${((Number(totals.latency) || 0) / 1000).toFixed(2)}s`} />
        <StatCard label="Failed requests" value={Number(totals.failed)} hint={total ? `${((Number(totals.failed) / total) * 100).toFixed(1)}% error rate` : "—"} />
      </div>
      <Charts series={series} byAgent={byAgent.map((b) => ({ name: b.name, messages: b.c, tokens: Number(b.tokens ?? 0) }))} popular={popular} totalTokens={Number(totals.tokens ?? 0)} />
    </div>
  );
}
