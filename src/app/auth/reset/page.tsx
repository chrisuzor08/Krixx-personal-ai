"use client";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/ui";
import { api, errMsg } from "@/lib/client";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <form
      className="card w-full max-w-sm space-y-4 p-7"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setErr("");
        try {
          await api("/api/auth/reset", { body: { token, password } });
          router.push("/dashboard");
        } catch (e) {
          setErr(errMsg(e));
          setLoading(false);
        }
      }}
    >
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <div>
        <label className="label" htmlFor="pw">New password</label>
        <input id="pw" type="password" className="input" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </div>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <button className="btn-primary w-full" disabled={loading || !token}>{loading && <Loader2 className="size-4 animate-spin" />}Update password</button>
    </form>
  );
}

export default function ResetPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      <Logo />
      <Suspense fallback={<div className="skeleton h-64 w-full max-w-sm" />}><ResetForm /></Suspense>
    </div>
  );
}
