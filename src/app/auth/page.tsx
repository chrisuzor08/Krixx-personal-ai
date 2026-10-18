import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "./auth-form";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  google: "Google sign-in failed. Please try again.",
  google_unconfigured: "Google sign-in isn't configured on this server yet (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
  verify: "That verification link is invalid or expired.",
};

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const sp = await searchParams;
  return (
    <AuthForm
      initialMode={sp.mode === "signup" ? "signup" : "login"}
      error={sp.error ? ERRORS[sp.error] ?? "Something went wrong." : undefined}
      googleEnabled={!!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET}
    />
  );
}
