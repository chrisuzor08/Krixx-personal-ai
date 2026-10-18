import { ArrowDown, Bell, Bot, Brain, Clock, Database, GitBranch, Globe, Mail, Play, Repeat, Sheet, Square, UserCheck, Webhook } from "lucide-react";
import { requirePageCtx } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Workflows" };

const NODES = [
  { icon: Play, name: "Start Trigger" }, { icon: Bot, name: "AI Agent" }, { icon: Brain, name: "User Input" }, { icon: GitBranch, name: "Conditional Branch" },
  { icon: Database, name: "Knowledge Search" }, { icon: Globe, name: "HTTP Request" }, { icon: Webhook, name: "Webhook" }, { icon: Clock, name: "Delay" },
  { icon: Repeat, name: "Data Transformation" }, { icon: Mail, name: "Email" }, { icon: Sheet, name: "Google Sheets" }, { icon: Bell, name: "Notification" },
  { icon: UserCheck, name: "Human Approval" }, { icon: Square, name: "End Workflow" },
];

export default async function WorkflowsPage() {
  await requirePageCtx();
  return (
    <div className="animate-fade-up">
      <PageHeader title="Workflows" description="Visual AI automation — chain agents, logic and external actions." />
      <div className="card relative overflow-hidden p-8 sm:p-10">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative grid gap-10 lg:grid-cols-2">
          <div>
            <span className="badge border-warn/30 bg-warn/10 text-warn">In development · Phase 5</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">The Visual Workflow Builder is coming next.</h2>
            <p className="mt-3 text-muted">A drag-and-drop canvas with server-side execution, permission checks, execution limits, logs, retries and human-approval steps. The database schema (workflows, nodes, edges, executions) is already in place — we&apos;re not shipping a mock canvas that can&apos;t actually run.</p>
            <ul className="mt-6 space-y-2 text-sm">
              {["Drag-and-drop nodes & visual edges", "Per-node configuration and testing", "Execution history with success / failure / pending", "Retry failed steps", "Server-side execution with workspace permissions"].map((f) => (
                <li key={f} className="flex gap-2"><span className="mt-2 size-1.5 rounded-full bg-violet" />{f}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center gap-2" aria-hidden>
            {["Start Trigger", "Knowledge Search", "AI Agent", "Human Approval", "Email"].map((n, i, a) => (
              <div key={n} className="flex flex-col items-center gap-2">
                <div className={`w-56 rounded-xl border px-4 py-3 text-center text-sm shadow-soft ${i === 2 ? "border-violet bg-violet-soft" : "border-line-strong bg-elevated"}`}>{n}</div>
                {i < a.length - 1 && <ArrowDown className="size-4 text-muted" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <h3 className="label mb-3 mt-10">Planned node types</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {NODES.map((n) => (
          <div key={n.name} className="card flex flex-col items-center gap-2 p-4 text-center text-xs"><n.icon className="size-5 text-cyan" />{n.name}</div>
        ))}
      </div>
    </div>
  );
}
