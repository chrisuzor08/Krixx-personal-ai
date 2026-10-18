"use client";
import { Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

export function Logo({ size = "md", href = "/" }: { size?: "sm" | "md"; href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="KRiXX AI home">
      <span className={`relative grid place-items-center rounded-xl ${size === "sm" ? "size-7" : "size-8"}`} style={{ background: "linear-gradient(135deg,var(--violet),var(--cyan))" }}>
        <svg viewBox="0 0 24 24" className="size-[60%] text-white" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M6 4v16M18 4l-8 8 8 8" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        KR<span className="text-violet">i</span>XX <span className="text-muted font-normal">AI</span>
      </span>
    </Link>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("krixx-theme", next ? "dark" : "light");
  };
  return (
    <button onClick={toggle} className="btn-ghost btn-sm !px-2" aria-label={`Switch to ${dark ? "light" : "dark"} theme`}>
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition disabled:opacity-50 ${checked ? "border-violet bg-violet" : "border-line-strong bg-elevated"}`}
    >
      <span className={`absolute top-0.5 size-[18px] rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function AgentAvatar({ avatar, color, size = 40 }: { avatar: string; color: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl"
      style={{ width: size, height: size, fontSize: size * 0.48, background: `linear-gradient(135deg, ${color}33, ${color}11)`, boxShadow: `inset 0 0 0 1px ${color}44` }}
      aria-hidden
    >
      {avatar}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal aria-label={title}>
      <div className={`card animate-fade-up max-h-[90dvh] w-full overflow-y-auto p-6 ${wide ? "max-w-3xl" : "max-w-lg"}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-ghost btn-sm !px-2" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-violet/30 blur-2xl" />
        <div className="relative grid size-16 place-items-center rounded-2xl border border-line-strong bg-elevated text-violet">{icon}</div>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const color = pct >= 90 ? "var(--danger)" : pct >= 70 ? "var(--warn)" : "var(--violet)";
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-elevated" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, var(--cyan))` }} />
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "border-success/30 bg-success/10 text-success",
    ready: "border-success/30 bg-success/10 text-success",
    draft: "border-line-strong bg-elevated text-muted",
    archived: "border-warn/30 bg-warn/10 text-warn",
    processing: "border-cyan/30 bg-cyan-soft text-cyan",
    failed: "border-danger/30 bg-danger/10 text-danger",
  };
  return <span className={`badge ${map[status] ?? map.draft}`}>{status}</span>;
}
