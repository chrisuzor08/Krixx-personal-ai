"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { date: string; messages: number; conversations: number; tokens: number; failed: number; latency: number };

const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;
const tip = { contentStyle: { background: "var(--elevated)", border: "1px solid var(--line-strong)", borderRadius: 12, fontSize: 12, color: "var(--fg)" }, cursor: { fill: "var(--violet-soft)" } };

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-5 ${className}`}>
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export function Charts({ series, byAgent, popular, totalTokens }: { series: Point[]; byAgent: { name: string; messages: number; tokens: number }[]; popular: { q: string; c: number }[]; totalTokens: number }) {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Panel title="Messages over time" className="lg:col-span-2">
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--violet)" stopOpacity={0.45} /><stop offset="1" stopColor="var(--violet)" stopOpacity={0} /></linearGradient>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--cyan)" stopOpacity={0.35} /><stop offset="1" stopColor="var(--cyan)" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" {...axis} minTickGap={20} />
              <YAxis {...axis} allowDecimals={false} width={32} />
              <Tooltip {...tip} />
              <Area type="monotone" dataKey="messages" stroke="var(--violet)" fill="url(#gm)" strokeWidth={2} name="Messages" />
              <Area type="monotone" dataKey="conversations" stroke="var(--cyan)" fill="url(#gc)" strokeWidth={2} name="Conversations" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title={`Token consumption · ${totalTokens.toLocaleString()} total`}>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={series}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" {...axis} minTickGap={20} />
              <YAxis {...axis} width={44} />
              <Tooltip {...tip} />
              <Bar dataKey="tokens" fill="var(--violet)" radius={[4, 4, 0, 0]} name="Tokens" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Response time (ms) & failures">
        <div className="h-56">
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" {...axis} minTickGap={20} />
              <YAxis {...axis} width={44} />
              <Tooltip {...tip} />
              <Line type="monotone" dataKey="latency" stroke="var(--cyan)" strokeWidth={2} dot={false} name="Avg latency (ms)" />
              <Line type="monotone" dataKey="failed" stroke="var(--danger)" strokeWidth={2} dot={false} name="Failed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Usage by agent">
        {byAgent.length === 0 ? <p className="py-10 text-center text-sm text-muted">No usage in this period.</p> : (
          <div className="space-y-3">
            {byAgent.map((a) => (
              <div key={a.name}>
                <div className="mb-1 flex justify-between text-xs"><span className="truncate">{a.name}</span><span className="font-mono text-muted">{a.messages} msgs · {a.tokens.toLocaleString()} tok</span></div>
                <div className="h-1.5 rounded-full bg-elevated"><div className="h-full rounded-full" style={{ width: `${(a.messages / byAgent[0].messages) * 100}%`, background: "linear-gradient(90deg,var(--violet),var(--cyan))" }} /></div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Popular questions">
        {popular.length === 0 ? <p className="py-10 text-center text-sm text-muted">No questions yet.</p> : (
          <ol className="space-y-2 text-sm">
            {popular.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 truncate">{p.q}</span>
                <span className="badge border-line-strong text-muted">{p.c}×</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
