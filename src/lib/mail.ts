import "server-only";

/** Sends transactional email via Resend when RESEND_API_KEY is configured. Returns false if email is not configured. */
export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[mail] RESEND_API_KEY not set — email to ${to} not sent: ${subject}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM || "KRiXX AI <onboarding@resend.dev>", to, subject, html }),
  });
  if (!res.ok) console.error("[mail] send failed", res.status);
  return res.ok;
}

export const emailConfigured = () => !!process.env.RESEND_API_KEY;

export function appUrl(req?: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (req) {
    const h = req.headers;
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}
