"use client";
import { Archive, Bot, Copy, ExternalLink, MessageSquare, MoreHorizontal, Pencil, Plus, Rocket, Search, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useToast } from "@/components/toast";
import { AgentAvatar, EmptyState, Modal, StatusBadge } from "@/components/ui";
import { api, errMsg } from "@/lib/client";

type Row = { id: string; name: string; description: string; avatar: string; avatarColor: string; status: string; slug: string; updatedAt: string; createdAt: string; conversations: number };

export function AgentsList({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("updated");
  const [menu, setMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Row | null>(null);

  const list = useMemo(() => {
    let r = rows.filter((a) => (status === "all" ? a.status !== "archived" || false : a.status === status));
    if (status === "all") r = rows.filter((a) => a.status !== "archived");
    if (q) r = r.filter((a) => (a.name + a.description).toLowerCase().includes(q.toLowerCase()));
    return [...r].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : sort === "created" ? b.createdAt.localeCompare(a.createdAt) : sort === "conversations" ? b.conversations - a.conversations : b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [rows, q, status, sort]);

  async function setAgentStatus(a: Row, s: string) {
    setMenu(null);
    try {
      await api(`/api/agents/${a.id}`, { method: "PATCH", body: { status: s, ...(s === "published" ? { visibility: "public" } : {}) } });
      setRows((r) => r.map((x) => (x.id === a.id ? { ...x, status: s } : x)));
      toast("success", { published: "Agent published", draft: "Agent unpublished", archived: "Agent archived" }[s] ?? "Updated");
    } catch (e) {
      toast("error", errMsg(e));
    }
  }

  async function duplicate(a: Row) {
    setMenu(null);
    try {
      await api(`/api/agents/${a.id}?action=duplicate`, { method: "POST" });
      toast("success", "Agent duplicated");
      router.refresh();
      const fresh = await api<{ agents: (Row & { updatedAt: string })[] }>("/api/agents");
      setRows((old) => fresh.agents.map((n) => ({ ...n, conversations: old.find((o) => o.id === n.id)?.conversations ?? 0 })));
    } catch (e) {
      toast("error", errMsg(e));
    }
  }

  async function remove(a: Row) {
    try {
      await api(`/api/agents/${a.id}`, { method: "DELETE" });
      setRows((r) => r.filter((x) => x.id !== a.id));
      toast("success", "Agent deleted");
      router.refresh();
    } catch (e) {
      toast("error", errMsg(e));
    }
    setConfirm(null);
  }

  if (!rows.length)
    return <EmptyState icon={<Bot className="size-7" />} title="Build your first agent" text="Pick a template like Customer Support or Coding Assistant and customize it in minutes." action={<Link href="/dashboard/agents/new" className="btn-primary"><Plus className="size-4" /> Create agent</Link>} />;

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search agents…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search agents" />
        </div>
        <select className="input sm:w-40" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All active</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select className="input sm:w-44" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="updated">Recently updated</option>
          <option value="created">Newest</option>
          <option value="name">Name A–Z</option>
          <option value="conversations">Most conversations</option>
        </select>
      </div>

      {list.length === 0 ? (
        <p className="card p-10 text-center text-sm text-muted">No agents match your filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((a) => (
            <div key={a.id} className="card group relative flex flex-col p-5 transition hover:border-violet/40">
              <div className="flex items-start gap-3">
                <AgentAvatar avatar={a.avatar} color={a.avatarColor} size={44} />
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/agents/${a.id}`} className="block truncate font-medium hover:text-violet">{a.name}</Link>
                  <div className="mt-1"><StatusBadge status={a.status} /></div>
                </div>
                <div className="relative">
                  <button className="btn-ghost btn-sm !px-2" onClick={() => setMenu(menu === a.id ? null : a.id)} aria-label="Agent actions" aria-expanded={menu === a.id}>
                    <MoreHorizontal className="size-4" />
                  </button>
                  {menu === a.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                      <div className="card animate-fade-up absolute right-0 z-20 mt-1 w-48 p-1.5 text-sm">
                        <MenuItem icon={Pencil} label="Edit" onClick={() => router.push(`/dashboard/agents/${a.id}`)} />
                        <MenuItem icon={Copy} label="Duplicate" onClick={() => duplicate(a)} />
                        {a.status === "published" ? (
                          <MenuItem icon={Undo2} label="Unpublish" onClick={() => setAgentStatus(a, "draft")} />
                        ) : (
                          <MenuItem icon={Rocket} label="Publish" onClick={() => setAgentStatus(a, "published")} />
                        )}
                        {a.status === "archived" ? (
                          <MenuItem icon={Undo2} label="Restore" onClick={() => setAgentStatus(a, "draft")} />
                        ) : (
                          <MenuItem icon={Archive} label="Archive" onClick={() => setAgentStatus(a, "archived")} />
                        )}
                        <MenuItem icon={Trash2} label="Delete" danger onClick={() => (setMenu(null), setConfirm(a))} />
                      </div>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted">{a.description || "No description"}</p>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
                <span className="flex items-center gap-1"><MessageSquare className="size-3.5" /> {a.conversations} conversations</span>
                <div className="flex gap-1.5">
                  {a.status === "published" && (
                    <a href={`/agent/${a.slug}`} target="_blank" className="btn-ghost btn-sm !px-2" aria-label="Open public page"><ExternalLink className="size-3.5" /></a>
                  )}
                  <Link href={`/dashboard/agents/${a.id}/playground`} className="btn-secondary btn-sm">Test</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Delete agent?">
        <p className="text-sm text-muted">This permanently deletes <b className="text-fg">{confirm?.name}</b>, its settings and all of its conversations. This cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
          <button className="btn-danger" onClick={() => confirm && remove(confirm)}><Trash2 className="size-4" /> Delete</button>
        </div>
      </Modal>
    </>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-elevated ${danger ? "text-danger" : ""}`}>
      <Icon className="size-4" /> {label}
    </button>
  );
}
