import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "./marketing";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-muted [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
