import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="font-medium uppercase tracking-wider">{label}</span>
        <span className="text-violet">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{typeof value === "number" ? value.toLocaleString() : value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
