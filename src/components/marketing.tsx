import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plan-config";
import { Logo, ThemeToggle } from "./ui";

export function SiteHeader({ authed }: { authed?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex" aria-label="Main">
          <Link href="/#features" className="hover:text-fg">Features</Link>
          <Link href="/#knowledge" className="hover:text-fg">Knowledge</Link>
          <Link href="/#integrations" className="hover:text-fg">Integrations</Link>
          <Link href="/pricing" className="hover:text-fg">Pricing</Link>
          <Link href="/#faq" className="hover:text-fg">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {authed ? (
            <Link href="/dashboard" className="btn-primary btn-sm">Dashboard</Link>
          ) : (
            <>
              <Link href="/auth" className="btn-ghost btn-sm hidden sm:inline-flex">Sign in</Link>
              <Link href="/auth?mode=signup" className="btn-primary btn-sm">Start free</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted">Build. Train. Connect. Automate. Deploy. The no-code platform for intelligent AI agents.</p>
        </div>
        <div className="text-sm">
          <div className="label">Product</div>
          <ul className="space-y-2 text-muted">
            <li><Link href="/auth?mode=signup" className="hover:text-fg">Agent Studio</Link></li>
            <li><Link href="/pricing" className="hover:text-fg">Pricing</Link></li>
            <li><Link href="/#faq" className="hover:text-fg">FAQ</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="label">Legal</div>
          <ul className="space-y-2 text-muted">
            <li><Link href="/terms" className="hover:text-fg">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-fg">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-6 text-center text-xs text-muted">© {new Date().getFullYear()} KRiXX AI. All rights reserved.</div>
    </footer>
  );
}

export function PricingCards() {
  return (
    <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
      {Object.values(PLANS).map((p) => (
        <div key={p.id} className={`card relative p-7 ${p.id === "free" ? "glow" : ""}`}>
          {p.id === "free" && <span className="badge absolute -top-3 left-7 border-violet/40 bg-violet text-white">Available now</span>}
          <h3 className="text-lg font-semibold">{p.name}</h3>
          <p className="mt-1 text-sm text-muted">{p.tagline}</p>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight">{p.price}</span>
            {p.id === "free" && <span className="text-sm text-muted">/ forever</span>}
          </div>
          <ul className="mt-6 space-y-2.5 text-sm">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className={`mt-0.5 size-4 shrink-0 ${p.available ? "text-violet" : "text-muted"}`} />
                <span className={p.available ? "" : "text-muted"}>{f}</span>
              </li>
            ))}
          </ul>
          {p.available ? (
            <Link href="/auth?mode=signup" className="btn-primary mt-7 w-full">Start Building Free</Link>
          ) : (
            <button disabled className="btn-secondary mt-7 w-full">Coming soon — no billing yet</button>
          )}
        </div>
      ))}
    </div>
  );
}
