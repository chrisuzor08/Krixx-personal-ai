"use client";
import { AlertTriangle, BadgeCheck, Building2, KeyRound, Loader2, LogOut, ScrollText, Shield, Sparkles, Trash2, User, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useToast } from "@/components/toast";
import { Meter, Modal } from "@/components/ui";
import { api, errMsg } from "@/lib/client";

type Usage = { messages: { used: number; limit: number }; agents: { used: number; limit: number }; knowledge: { used: number; limit: number }; resetsAt: string };

type Props = {
  user: { name: string; email: string; verified: boolean; hasPassword: boolean; google: boolean };
  workspace: { name: string; plan: string; role: string };
  members: { name: string; email: string; role: string }[];
  sessions: number;
  usage: Usage;
  logs: { id: string; action: string; at: string }[];
};

function Section({ icon, title, desc, children }: { icon: ReactNode; title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="card grid gap-6 p-6 md:grid-cols-[240px_1fr]">
      <div>
        <h2 className="flex items-center gap-2 font-semibold"><span className="text-violet">{icon}</span>{title}</h2>
        {desc && <p className="mt-1 text-xs text-muted">{desc}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function SettingsForms({ user, workspace, members, sessions, usage, logs }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [wsName, setWsName] = useState(workspace.name);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState("");
  const [del, setDel] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try {
      await fn();
      toast("success", ok);
      router.refresh();
    } catch (e) {
      toast("error", errMsg(e));
    }
    setBusy("");
  }

  const spin = (k: string) => busy === k && <Loader2 className="size-4 animate-spin" />;

  return (
    <div className="space-y-6">
      <Section icon={<User className="size-4" />} title="Profile" desc="Your personal information.">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run("profile", () => api("/api/account", { method: "PATCH", body: { name } }), "Profile updated"); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="s-name">Name</label><input id="s-name" className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <label className="label" htmlFor="s-email">Email</label>
              <input id="s-email" className="input" value={user.email} disabled />
              <p className={`mt-1.5 flex items-center gap-1 text-xs ${user.verified ? "text-success" : "text-warn"}`}><BadgeCheck className="size-3" />{user.verified ? "Verified" : "Not verified — check your inbox for the verification link"}</p>
            </div>
          </div>
          <button className="btn-primary" disabled={!!busy || !name.trim()}>{spin("profile")} Save profile</button>
        </form>
      </Section>

      <Section icon={<Building2 className="size-4" />} title="Workspace" desc="Workspaces are designed for team collaboration with role-based permissions.">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); run("ws", () => api("/api/account", { method: "PATCH", body: { workspaceName: wsName } }), "Workspace renamed"); }}>
          <div className="flex-1"><label className="label" htmlFor="s-ws">Workspace name</label><input id="s-ws" className="input" value={wsName} maxLength={80} onChange={(e) => setWsName(e.target.value)} /></div>
          <button className="btn-secondary" disabled={!!busy || !wsName.trim()}>{spin("ws")} Rename</button>
        </form>
        <div className="mt-6">
          <div className="label flex items-center gap-1.5"><Users className="size-3" /> Members</div>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {members.map((m) => (
              <li key={m.email} className="flex items-center justify-between px-4 py-3 text-sm">
                <div><div>{m.name || m.email}</div><div className="text-xs text-muted">{m.email}</div></div>
                <span className="badge border-violet/30 bg-violet-soft capitalize text-violet">{m.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Roles: <b>Owner</b> (everything) · <b>Admin</b> (manage workspace) · <b>Editor</b> (build agents) · <b>Viewer</b> (read-only). Team invitations are coming with the Pro plan.</p>
        </div>
      </Section>

      <Section icon={<Sparkles className="size-4" />} title="Plan & usage" desc={`Usage resets on ${new Date(usage.resetsAt).toLocaleDateString()}.`}>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm">Current plan: <b className="capitalize">{workspace.plan}</b></span>
          <Link href="/pricing" className="btn-secondary btn-sm">View plans</Link>
        </div>
        <div className="space-y-4">
          <Meter label="Messages this month" used={usage.messages.used} limit={usage.messages.limit} />
          <Meter label="Agents" used={usage.agents.used} limit={usage.agents.limit} />
          <Meter label="Knowledge sources" used={usage.knowledge.used} limit={usage.knowledge.limit} />
        </div>
      </Section>

      <Section icon={<KeyRound className="size-4" />} title="Security" desc="Password and active sessions.">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run("pw", async () => { await api("/api/account", { method: "PATCH", body: user.hasPassword ? pw : { newPassword: pw.newPassword } }); setPw({ currentPassword: "", newPassword: "" }); }, "Password updated"); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            {user.hasPassword && <div><label className="label" htmlFor="s-cur">Current password</label><input id="s-cur" type="password" className="input" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>}
            <div><label className="label" htmlFor="s-new">{user.hasPassword ? "New password" : "Set a password"}</label><input id="s-new" type="password" className="input" minLength={8} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
          </div>
          <button className="btn-secondary" disabled={!!busy || pw.newPassword.length < 8}>{spin("pw")} Update password</button>
        </form>
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm"><Shield className="mr-1.5 inline size-4 text-cyan" />{sessions} active session{sessions === 1 ? "" : "s"}{user.google && " · Google linked"}</div>
          <button className="btn-secondary btn-sm" disabled={sessions < 2 || !!busy} onClick={() => run("so", () => api("/api/account?action=signout-others", { method: "POST" }), "Signed out of other sessions")}><LogOut className="size-3.5" /> Sign out other sessions</button>
        </div>
      </Section>

      <Section icon={<ScrollText className="size-4" />} title="Audit log" desc="Recent security-relevant events in this workspace.">
        {logs.length === 0 ? <p className="text-sm text-muted">No events yet.</p> : (
          <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-xl border border-line font-mono text-xs">
            {logs.map((l) => <li key={l.id} className="flex justify-between gap-4 px-4 py-2"><span>{l.action}</span><span className="text-muted">{new Date(l.at).toLocaleString()}</span></li>)}
          </ul>
        )}
      </Section>

      <Section icon={<AlertTriangle className="size-4 text-danger" />} title="Danger zone" desc="Permanent actions.">
        <div className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm"><div className="font-medium">Delete account</div><div className="text-xs text-muted">Deletes your account, workspace, agents, knowledge and all conversations.</div></div>
          <button className="btn-danger" onClick={() => setDel(true)}><Trash2 className="size-4" /> Delete account</button>
        </div>
      </Section>

      <Modal open={del} onClose={() => setDel(false)} title="Delete your account?">
        <p className="text-sm text-muted">This permanently erases everything. Type <b className="font-mono text-fg">DELETE</b> to confirm.</p>
        <input className="input mt-4" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Type DELETE to confirm" />
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setDel(false)}>Cancel</button>
          <button className="btn-danger" disabled={confirmText !== "DELETE" || !!busy} onClick={async () => { setBusy("del"); try { await api("/api/account", { method: "DELETE" }); router.push("/"); router.refresh(); } catch (e) { toast("error", errMsg(e)); setBusy(""); } }}>{spin("del")} Delete forever</button>
        </div>
      </Modal>
    </div>
  );
}
