"use client";
import { Check, Copy, ExternalLink, Globe, Loader2, Lock, RefreshCw, Rocket, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { AgentAvatar, EmptyState, Switch } from "@/components/ui";
import { api, errMsg } from "@/lib/client";
import type { WidgetConfig } from "@/db/schema";

type A = { id: string; name: string; slug: string; avatar: string; avatarColor: string; status: string; visibility: string; welcome: string; widget: WidgetConfig };

export function DeploymentCenter({ agents: initial }: { agents: A[] }) {
  const toast = useToast();
  const [agents, setAgents] = useState(initial);
  const [sel, setSel] = useState(initial[0]?.id ?? "");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const a = agents.find((x) => x.id === sel);
  const [w, setW] = useState<WidgetConfig | null>(a?.widget ?? null);
  useEffect(() => setW(agents.find((x) => x.id === sel)?.widget ?? null), [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!a || !w) return <EmptyState icon={<Rocket className="size-7" />} title="Nothing to deploy yet" text="Create an agent first, then publish it here." action={<Link href="/dashboard/agents/new" className="btn-primary">Create agent</Link>} />;

  const live = a.status === "published" && a.visibility === "public";
  const url = `${origin}/agent/${a.slug}`;
  const embed = `<script src="${origin}/api/widget?agent=${a.slug}" async></script>`;
  const update = (patch: Partial<A>) => setAgents((all) => all.map((x) => (x.id === a.id ? { ...x, ...patch } : x)));

  const copy = (t: string, k: string) => {
    navigator.clipboard.writeText(t);
    setCopied(k);
    setTimeout(() => setCopied(""), 1500);
  };

  async function run(body: Record<string, unknown>, ok: string, patch: Partial<A>) {
    setBusy(true);
    try {
      await api(`/api/agents/${a!.id}`, { method: "PATCH", body });
      update(patch);
      toast("success", ok);
    } catch (e) {
      toast("error", errMsg(e));
    }
    setBusy(false);
  }

  async function regen() {
    if (!confirm("Regenerate the share link? The old link and embed code will stop working.")) return;
    try {
      const { slug } = await api<{ slug: string }>(`/api/agents/${a!.id}?action=regenerate-link`, { method: "POST" });
      update({ slug });
      toast("success", "New share link generated");
    } catch (e) {
      toast("error", errMsg(e));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="card h-fit p-2">
        {agents.map((x) => (
          <button key={x.id} onClick={() => setSel(x.id)} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${sel === x.id ? "bg-elevated" : "hover:bg-elevated/50"}`}>
            <AgentAvatar avatar={x.avatar} color={x.avatarColor} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{x.name}</div>
              <div className={`text-[11px] ${x.status === "published" && x.visibility === "public" ? "text-success" : "text-muted"}`}>{x.status === "published" && x.visibility === "public" ? "● Live" : x.status}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">{live ? <Globe className="size-4 text-success" /> : <Lock className="size-4 text-muted" />} Deployment status: {live ? <span className="text-success">Live</span> : <span className="text-muted">Not live</span>}</h2>
              <p className="mt-1 text-sm text-muted">{live ? "Anyone with the link can chat with this agent." : "Publish to make this agent reachable via its share link and widget."}</p>
            </div>
            <div className="flex gap-2">
              {a.status === "published" ? (
                <button className="btn-secondary" disabled={busy} onClick={() => run({ status: "draft" }, "Agent unpublished", { status: "draft" })}>Unpublish</button>
              ) : (
                <button className="btn-primary" disabled={busy} onClick={() => run({ status: "published", visibility: "public" }, "Agent is live!", { status: "published", visibility: "public" })}><Rocket className="size-4" /> Publish</button>
              )}
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-line pt-5">
            <div><div className="text-sm font-medium">Public visibility</div><div className="text-xs text-muted">Private agents are only accessible from your dashboard.</div></div>
            <Switch checked={a.visibility === "public"} onChange={(v) => run({ visibility: v ? "public" : "private" }, v ? "Agent set to public" : "Agent set to private", { visibility: v ? "public" : "private" })} label="Public visibility" />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold">Share link</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input readOnly className="input font-mono text-xs" value={url} aria-label="Share URL" />
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => copy(url, "url")}>{copied === "url" ? <Check className="size-4" /> : <Copy className="size-4" />} Copy</button>
              <a href={live ? url : undefined} target="_blank" className={`btn-secondary !px-3 ${live ? "" : "pointer-events-none opacity-50"}`} aria-label="Open"><ExternalLink className="size-4" /></a>
              <button className="btn-ghost !px-3" onClick={regen} title="Regenerate link" aria-label="Regenerate link"><RefreshCw className="size-4" /></button>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Website widget</h2>
            <button className="btn-primary btn-sm" disabled={busy} onClick={() => run({ widget: w }, "Widget saved", { widget: w })}>{busy ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Save widget</button>
          </div>
          <div className="mt-5 grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label" htmlFor="w-color">Primary color</label><div className="flex gap-2"><input id="w-color" type="color" value={w.primaryColor} onChange={(e) => setW({ ...w, primaryColor: e.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-line-strong bg-transparent" /><input className="input font-mono text-xs" value={w.primaryColor} onChange={(e) => setW({ ...w, primaryColor: e.target.value })} aria-label="Hex color" /></div></div>
                <div><label className="label" htmlFor="w-pos">Position</label><select id="w-pos" className="input" value={w.position} onChange={(e) => setW({ ...w, position: e.target.value as "left" | "right" })}><option value="right">Bottom right</option><option value="left">Bottom left</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label" htmlFor="w-icon">Launcher icon</label><select id="w-icon" className="input" value={w.launcherIcon} onChange={(e) => setW({ ...w, launcherIcon: e.target.value })}>{["💬", "🤖", "✨", "👋", "🎧", "❓", a.avatar].filter((v, i, arr) => arr.indexOf(v) === i).map((i) => <option key={i}>{i}</option>)}</select></div>
                <div><label className="label" htmlFor="w-header">Header text</label><input id="w-header" className="input" maxLength={60} value={w.headerText} onChange={(e) => setW({ ...w, headerText: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Width · {w.width}px</label><input type="range" min={300} max={520} value={w.width} onChange={(e) => setW({ ...w, width: Number(e.target.value) })} className="w-full accent-[var(--violet)]" aria-label="Width" /></div>
                <div><label className="label">Height · {w.height}px</label><input type="range" min={400} max={760} value={w.height} onChange={(e) => setW({ ...w, height: Number(e.target.value) })} className="w-full accent-[var(--violet)]" aria-label="Height" /></div>
              </div>
              <div className="flex items-center justify-between"><span className="text-sm">Show “Powered by KRiXX”</span><Switch checked={w.showBranding} onChange={(v) => setW({ ...w, showBranding: v })} label="Branding" /></div>
              <p className="text-xs text-muted">Welcome message & initial greeting are set in the agent editor: <Link href={`/dashboard/agents/${a.id}`} className="text-violet hover:underline">edit agent</Link>.</p>
              <div>
                <div className="label">Embed code</div>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-xl border border-line bg-[#0b0c12] p-3 pr-12 font-mono text-[11.5px] text-[#e5e7eb]">{embed}</pre>
                  <button className="btn-ghost btn-sm absolute right-1.5 top-1.5 !px-2" onClick={() => copy(embed, "embed")} aria-label="Copy embed code">{copied === "embed" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button>
                </div>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted">
                  <li>Publish the agent and save your widget settings.</li>
                  <li>Paste the snippet just before <code className="font-mono">&lt;/body&gt;</code> on your site.</li>
                  <li>Reload — the launcher appears in the {w.position === "right" ? "bottom-right" : "bottom-left"} corner.</li>
                </ol>
              </div>
            </div>

            {/* Live preview */}
            <div className="relative min-h-[460px] overflow-hidden rounded-2xl border border-line bg-[repeating-linear-gradient(45deg,var(--elevated),var(--elevated)_10px,var(--surface)_10px,var(--surface)_20px)]">
              <div className={`absolute bottom-20 flex w-[78%] flex-col overflow-hidden rounded-2xl border border-line-strong bg-bg shadow-soft ${w.position === "right" ? "right-4" : "left-4"}`} style={{ height: Math.min(360, w.height * 0.55) }}>
                <div className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-white" style={{ background: w.primaryColor }}>{a.avatar} {w.headerText}</div>
                <div className="flex-1 space-y-2 p-3 text-xs">
                  <div className="w-fit max-w-[85%] rounded-xl rounded-tl-sm bg-elevated px-3 py-2">{a.welcome || "Hi! How can I help?"}</div>
                  <div className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm px-3 py-2 text-white" style={{ background: w.primaryColor }}>Hello!</div>
                </div>
                <div className="border-t border-line p-2"><div className="rounded-lg border border-line px-2 py-1.5 text-[11px] text-muted">Type a message…</div></div>
                {w.showBranding && <div className="pb-1.5 text-center text-[9px] text-muted">Powered by KRiXX AI</div>}
              </div>
              <div className={`absolute bottom-4 grid size-12 place-items-center rounded-full text-xl shadow-lg ${w.position === "right" ? "right-4" : "left-4"}`} style={{ background: w.primaryColor }}>{w.launcherIcon}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
