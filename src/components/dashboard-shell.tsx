"use client";
import { BarChart3, Bot, ChevronsLeft, ChevronsRight, Database, LayoutDashboard, LogOut, Menu, Plug, Rocket, Settings, Sparkles, Workflow, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo, Meter, ThemeToggle } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/knowledge", label: "Knowledge", icon: Database },
  { href: "/dashboard/workflows", label: "Workflows", icon: Workflow },
  { href: "/dashboard/integrations", label: "Integrations", icon: Plug },
  { href: "/dashboard/deployments", label: "Deployments", icon: Rocket },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

type Props = {
  children: ReactNode;
  user: { name: string; email: string; avatarUrl: string | null };
  workspace: { name: string; plan: string; role: string };
  messages: { used: number; limit: number };
};

export function DashboardShell({ children, user, workspace, messages }: Props) {
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => setCollapsed(localStorage.getItem("krixx-sidebar") === "1"), []);
  useEffect(() => setMobile(false), [path]);

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("krixx-sidebar", c ? "0" : "1");
      return !c;
    });
  };

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const active = (n: (typeof NAV)[number]) => (n.exact ? path === n.href : path.startsWith(n.href));
  const isFull = /\/playground$/.test(path);

  const nav = (compact: boolean) => (
    <nav className="flex flex-col gap-0.5" aria-label="Dashboard">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          title={compact ? n.label : undefined}
          aria-current={active(n) ? "page" : undefined}
          className={`group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition ${active(n) ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/60 hover:text-fg"} ${compact ? "justify-center" : ""}`}
        >
          {active(n) && <span className="absolute left-0 top-2 h-5 w-0.5 rounded-full bg-violet" />}
          <n.icon className={`size-[18px] shrink-0 ${active(n) ? "text-violet" : ""}`} />
          {!compact && n.label}
        </Link>
      ))}
    </nav>
  );

  const footer = (compact: boolean) =>
    compact ? null : (
      <div className="space-y-3 rounded-xl border border-line bg-elevated/50 p-3">
        <Meter label="Messages this month" used={messages.used} limit={messages.limit} />
        <Link href="/pricing" className="flex items-center gap-1.5 text-xs text-violet hover:underline">
          <Sparkles className="size-3" /> {workspace.plan === "free" ? "Free plan · View plans" : `${workspace.plan} plan`}
        </Link>
      </div>
    );

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface/50 p-3 transition-[width] duration-200 lg:flex ${collapsed ? "w-[68px]" : "w-60"}`}>
        <div className={`mb-6 flex h-10 items-center ${collapsed ? "justify-center" : "justify-between px-1.5"}`}>
          {collapsed ? <Logo size="sm" href="/dashboard" /> : <Logo size="sm" href="/dashboard" />}
        </div>
        <div className="flex-1">{nav(collapsed)}</div>
        {footer(collapsed)}
        <button onClick={toggle} className="btn-ghost btn-sm mt-3" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> Collapse</>}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobile(false)} />
          <aside className="animate-fade-up absolute inset-y-0 left-0 flex w-72 flex-col bg-surface p-4">
            <div className="mb-6 flex items-center justify-between">
              <Logo size="sm" href="/dashboard" />
              <button onClick={() => setMobile(false)} className="btn-ghost btn-sm !px-2" aria-label="Close menu"><X className="size-4" /></button>
            </div>
            <div className="flex-1">{nav(false)}</div>
            {footer(false)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/75 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setMobile(true)} className="btn-ghost btn-sm !px-2 lg:hidden" aria-label="Open menu"><Menu className="size-5" /></button>
          <div className="min-w-0 flex-1 truncate text-sm">
            <span className="text-muted">{workspace.name}</span>
            <span className="badge ml-2 border-line-strong capitalize text-muted">{workspace.role}</span>
          </div>
          <ThemeToggle />
          <div className="hidden text-right text-xs sm:block">
            <div className="font-medium">{user.name || "You"}</div>
            <div className="text-muted">{user.email}</div>
          </div>
          <span className="grid size-8 place-items-center overflow-hidden rounded-full text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg,var(--violet),var(--cyan))" }}>
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : (user.name || user.email)[0]?.toUpperCase()}
          </span>
          <button onClick={logout} className="btn-ghost btn-sm !px-2" aria-label="Sign out" title="Sign out"><LogOut className="size-4" /></button>
        </header>
        <main className={isFull ? "min-h-0 flex-1" : "mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8"}>{children}</main>
      </div>
    </div>
  );
}
