import { getCurrentUser } from "@/lib/auth";
import { PricingCards, SiteFooter, SiteHeader } from "@/components/marketing";

export const metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await getCurrentUser();
  return (
    <>
      <SiteHeader authed={!!user} />
      <main className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">Pricing</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Start free. Scale when you&apos;re ready.</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">The Free plan is fully functional and has no time limit. Usage resets on the 1st of every month (UTC). Paid plans will launch alongside a real billing system — we won&apos;t charge for features that don&apos;t exist yet.</p>
        </div>
        <div className="mt-14"><PricingCards /></div>
        <div className="card mx-auto mt-10 max-w-4xl overflow-x-auto p-6">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted"><th className="pb-3 font-medium">Limit</th><th className="pb-3 font-medium">Free</th><th className="pb-3 font-medium">Pro (planned)</th></tr></thead>
            <tbody className="divide-y divide-line">
              {[["AI agents", "3", "25"], ["Messages / month", "500", "10,000"], ["Knowledge sources", "5", "100"], ["Premium models", "—", "✓"], ["Custom branding", "—", "✓"], ["API access", "—", "✓"]].map((r) => (
                <tr key={r[0]}>{r.map((c, i) => <td key={i} className="py-3">{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
