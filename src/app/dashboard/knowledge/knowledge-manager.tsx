"use client";
import { Database, FileText, Globe, Loader2, Pencil, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { EmptyState, Meter, Modal, StatusBadge, Switch } from "@/components/ui";
import { api, errMsg } from "@/lib/client";

type Source = { id: string; name: string; type: string; url: string | null; status: string; enabled: boolean; charCount: number; chunkCount: number; error: string | null; agentId: string | null; updatedAt: string };

const MAX_FILE = 2 * 1024 * 1024;

export function KnowledgeManager({ initial, agents, limit }: { initial: Source[]; agents: { id: string; name: string }[]; limit: number }) {
  const toast = useToast();
  const [sources, setSources] = useState(initial);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"text" | "file" | "url">("text");
  const [form, setForm] = useState({ name: "", content: "", url: "", agentId: "" });
  const [fileType, setFileType] = useState<"txt" | "md" | "csv">("txt");
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  const upsert = (s: Source) => setSources((all) => (all.some((x) => x.id === s.id) ? all.map((x) => (x.id === s.id ? s : x)) : [s, ...all]));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const agentId = form.agentId || null;
      const body = tab === "url" ? { type: "url", url: form.url, name: form.name || undefined, agentId } : { type: tab === "file" ? fileType : "text", name: form.name, content: form.content, agentId };
      const { source } = await api<{ source: Source }>("/api/knowledge", { body });
      upsert({ ...source, updatedAt: String(source.updatedAt) });
      if (source.status === "failed") toast("error", `Processing failed: ${source.error}`);
      else toast("success", `Indexed ${source.chunkCount} chunks from “${source.name}”`);
      setOpen(false);
      setForm({ name: "", content: "", url: "", agentId: "" });
    } catch (e) {
      toast("error", errMsg(e));
    }
    setBusy(false);
  }

  async function onFile(f?: File) {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (["pdf", "docx", "doc"].includes(ext)) return toast("info", "PDF and DOCX extraction is coming soon. For now, export as .txt or .md, or paste the text.");
    if (!["txt", "md", "markdown", "csv"].includes(ext)) return toast("error", "Supported files: .txt, .md, .csv");
    if (f.size > MAX_FILE) return toast("error", "Files must be under 2 MB");
    const text = await f.text();
    setFileType(ext === "csv" ? "csv" : ext === "txt" ? "txt" : "md");
    setForm((p) => ({ ...p, name: p.name || f.name, content: ext === "csv" ? csvToText(text) : text }));
  }

  async function patch(s: Source, body: Record<string, unknown>, msg?: string) {
    setWorking(s.id);
    try {
      const { source } = await api<{ source: Source }>(`/api/knowledge/${s.id}`, { method: "PATCH", body });
      upsert({ ...source, updatedAt: String(source.updatedAt) });
      if (msg) toast(source.status === "failed" ? "error" : "success", source.status === "failed" ? `Failed: ${source.error}` : msg);
    } catch (e) {
      toast("error", errMsg(e));
    }
    setWorking(null);
  }

  async function remove(s: Source) {
    if (!confirm(`Remove “${s.name}” and all of its indexed chunks?`)) return;
    try {
      await api(`/api/knowledge/${s.id}`, { method: "DELETE" });
      setSources((all) => all.filter((x) => x.id !== s.id));
      toast("success", "Source removed");
    } catch (e) {
      toast("error", errMsg(e));
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="card flex-1 p-4"><Meter label="Knowledge sources (Free plan)" used={sources.length} limit={limit} /></div>
        <button className="btn-primary h-11" onClick={() => setOpen(true)}><Plus className="size-4" /> Add source</button>
      </div>

      {sources.length === 0 ? (
        <EmptyState icon={<Database className="size-7" />} title="No knowledge yet" text="Add FAQs, policies, product docs or a website URL. Your agents will answer from them and cite the source." action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus className="size-4" /> Add your first source</button>} />
      ) : (
        <div className="card divide-y divide-line">
          {sources.map((s) => (
            <div key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-elevated text-cyan">{s.type === "url" ? <Globe className="size-4" /> : <FileText className="size-4" />}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{s.name}</span>
                    <button onClick={() => { const n = prompt("Rename source", s.name)?.trim(); if (n && n !== s.name) patch(s, { name: n }, "Renamed"); }} className="text-muted hover:text-fg" aria-label="Rename"><Pencil className="size-3" /></button>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    <StatusBadge status={s.status} />
                    <span className="uppercase">{s.type}</span>
                    <span>{s.chunkCount} chunks · {(s.charCount / 1000).toFixed(1)}K chars</span>
                    {s.error && <span className="text-danger">{s.error}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select className="input !h-8 !w-40 !text-xs" value={s.agentId ?? ""} onChange={(e) => patch(s, { agentId: e.target.value || null }, "Scope updated")} aria-label="Agent scope">
                  <option value="">All agents</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <Switch checked={s.enabled} onChange={(v) => patch(s, { enabled: v })} label={`Enable ${s.name}`} />
                <button className="btn-ghost btn-sm !px-2" onClick={() => patch(s, { reindex: true }, "Re-indexed")} disabled={working === s.id} aria-label="Re-index">
                  <RefreshCw className={`size-4 ${working === s.id ? "animate-spin" : ""}`} />
                </button>
                <button className="btn-ghost btn-sm !px-2 hover:!text-danger" onClick={() => remove(s)} aria-label="Delete source"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-line bg-surface/50 p-4 text-xs text-muted">
        <b className="text-fg">How retrieval works:</b> content is normalized, split into overlapping paragraph-aware chunks and indexed with PostgreSQL full-text ranking. On each message the top passages above the agent&apos;s confidence threshold are injected as <i>untrusted reference data</i> — they can never override the agent&apos;s security rules. Semantic vector embeddings (pgvector) are on the roadmap.
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add knowledge source" wide>
        <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl border border-line bg-bg/50 p-1" role="tablist">
          {([["text", "Paste text", FileText], ["file", "Upload file", Upload], ["url", "Website URL", Globe]] as const).map(([id, label, Icon]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm transition ${tab === id ? "bg-elevated text-fg" : "text-muted"}`}><Icon className="size-4" /> {label}</button>
          ))}
        </div>
        <form onSubmit={add} className="space-y-4">
          {tab === "url" ? (
            <div><label className="label" htmlFor="ks-url">Page URL</label><input id="ks-url" className="input" type="url" required placeholder="https://example.com/faq" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /><p className="mt-1.5 text-xs text-muted">We fetch the public page, strip navigation and scripts, and index the readable text.</p></div>
          ) : (
            <>
              {tab === "file" && (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted transition hover:border-violet">
                  <Upload className="size-6 text-violet" />
                  <span>Click to choose a <b>.txt</b>, <b>.md</b> or <b>.csv</b> file (max 2 MB)</span>
                  <span className="text-[11px]">PDF & DOCX extraction — coming soon</span>
                  <input type="file" accept=".txt,.md,.markdown,.csv,.pdf,.docx" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
              )}
              <div><label className="label" htmlFor="ks-name">Name</label><input id="ks-name" className="input" required maxLength={120} placeholder="e.g. Refund policy" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="label" htmlFor="ks-content">Content</label><textarea id="ks-content" className="input font-mono text-xs" rows={10} required placeholder="Paste FAQs, policies, docs…" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /><div className="mt-1 text-right text-[11px] text-muted">{form.content.length.toLocaleString()} chars</div></div>
            </>
          )}
          <div><label className="label" htmlFor="ks-agent">Available to</label>
            <select id="ks-agent" className="input" value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })}>
              <option value="">All agents in workspace</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} {busy ? "Processing…" : "Add & index"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/** Converts CSV rows into "header: value" lines so each row is a self-contained, retrievable passage. */
function csvToText(csv: string) {
  const rows = csv.split(/\r?\n/).filter(Boolean).map((r) => r.split(",").map((c) => c.replace(/^"|"$/g, "").trim()));
  const [head, ...body] = rows;
  if (!head) return csv;
  return body.map((r) => head.map((h, i) => `${h}: ${r[i] ?? ""}`).join("; ")).join("\n\n");
}
