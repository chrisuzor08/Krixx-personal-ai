"use client";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/ui";
import { api, errMsg } from "@/lib/client";

type Mode = "login" | "signup" | "forgot";

export function AuthForm({ initialMode, error, googleEnabled }: { initialMode: Mode; error?: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(error ?? "");
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        const r = await api<{ emailConfigured: boolean }>("/api/auth/forgot", { body: { email: form.email } });
        setInfo(r.emailConfigured ? "If an account exists for that email, a reset link is on its way." : "Password reset emails require RESEND_API_KEY to be configured on the server. Please contact the administrator.");
      } else {
        await api(`/api/auth/${mode}`, { body: mode === "signup" ? form : { email: form.email, password: form.password } });
        router.push(mode === "signup" ? "/dashboard/agents/new?welcome=1" : "/dashboard");
        router.refresh();
        return;
      }
    } catch (e) {
      setErr(errMsg(e));
    }
    setLoading(false);
  }

  const title = { login: "Welcome back", signup: "Create your account", forgot: "Reset your password" }[mode];
  const sub = { login: "Sign in to your KRiXX workspace.", signup: "Start building AI agents for free — no credit card.", forgot: "We'll email you a secure reset link." }[mode];

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted">{sub}</p>

          {mode !== "forgot" && (
            <>
              <a
                href={googleEnabled ? "/api/auth/google" : undefined}
                aria-disabled={!googleEnabled}
                title={googleEnabled ? undefined : "Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"}
                className={`btn-secondary mt-8 w-full ${googleEnabled ? "" : "pointer-events-none opacity-50"}`}
              >
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/></svg>
                Continue with Google {googleEnabled ? "" : "(not configured)"}
              </a>
              <div className="my-6 flex items-center gap-3 text-xs text-muted"><div className="h-px flex-1 bg-line" />or<div className="h-px flex-1 bg-line" /></div>
            </>
          )}
          {mode === "forgot" && <div className="mt-8" />}

          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode === "signup" && (
              <div>
                <label className="label" htmlFor="name">Name</label>
                <input id="name" className="input" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ada Lovelace" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" />
            </div>
            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="label" htmlFor="password">Password</label>
                  {mode === "login" && <button type="button" onClick={() => setMode("forgot")} className="mb-1.5 text-xs text-violet hover:underline">Forgot?</button>}
                </div>
                <input id="password" type="password" className="input" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 8 : 1} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"} />
              </div>
            )}
            {err && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}
            {info && <p role="status" className="rounded-lg border border-cyan/30 bg-cyan-soft px-3 py-2 text-sm text-cyan">{info}</p>}
            <button className="btn-primary h-11 w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {{ login: "Sign in", signup: "Create account", forgot: "Send reset link" }[mode]}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {mode === "login" && <>New to KRiXX? <button onClick={() => setMode("signup")} className="text-violet hover:underline">Create an account</button></>}
            {mode === "signup" && <>Already have an account? <button onClick={() => setMode("login")} className="text-violet hover:underline">Sign in</button></>}
            {mode === "forgot" && <button onClick={() => setMode("login")} className="inline-flex items-center gap-1 text-violet hover:underline"><ArrowLeft className="size-3" /> Back to sign in</button>}
          </p>
          {mode === "signup" && <p className="mt-4 text-center text-xs text-muted">By signing up you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>}
        </div>
      </div>
      <div className="relative hidden overflow-hidden border-l border-line bg-surface lg:block">
        <div className="grid-bg absolute inset-0" />
        <div className="absolute left-1/2 top-1/3 size-[480px] -translate-x-1/2 rounded-full opacity-40 blur-[110px]" style={{ background: "radial-gradient(closest-side,var(--violet),transparent)" }} />
        <div className="relative flex h-full flex-col justify-end p-14">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Build · Train · Connect · Automate · Deploy</div>
          <p className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-tight">Your Ideas. Your AI. <span className="gradient-text">Your Rules.</span></p>
        </div>
      </div>
    </div>
  );
}
