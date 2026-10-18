import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { authTokens, sessions, users } from "@/db/schema";
import { audit, clientIp, handler, HttpError, json, parseBody, rateLimit } from "@/lib/api";
import { createSession, destroySession, hashPassword, provisionWorkspace, randomToken, sha256, verifyPassword } from "@/lib/auth";
import { appUrl, sendEmail } from "@/lib/mail";
import { forgotSchema, loginSchema, resetSchema, signupSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request, { params }: { params: Promise<{ action: string }> }) => {
  const { action } = await params;
  const ip = clientIp(req);

  switch (action) {
    case "signup": {
      rateLimit(`signup:${ip}`, 10, 60 * 60_000);
      const body = await parseBody(req, signupSchema);
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
      if (existing[0]) throw new HttpError(409, "An account with this email already exists. Try signing in.");
      const [user] = await db
        .insert(users)
        .values({ email: body.email, name: body.name, passwordHash: await hashPassword(body.password) })
        .returning();
      const ws = await provisionWorkspace(user.id, body.name.split(" ")[0]);
      // Email verification token
      const token = randomToken();
      await db.insert(authTokens).values({ userId: user.id, type: "verify", tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3 * 86400_000) });
      await sendEmail(
        user.email,
        "Verify your KRiXX AI email",
        `<p>Welcome to KRiXX AI, ${body.name}!</p><p><a href="${appUrl(req)}/api/auth/verify?token=${token}">Verify your email</a></p>`
      );
      await createSession(user.id);
      await audit({ user, workspace: ws }, "auth.signup");
      return json({ ok: true });
    }
    case "login": {
      rateLimit(`login:${ip}`, 20, 15 * 60_000);
      const body = await parseBody(req, loginSchema);
      const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
      if (!user || !(await verifyPassword(body.password, user.passwordHash)))
        throw new HttpError(401, user && !user.passwordHash ? "This account uses Google sign-in." : "Incorrect email or password");
      await createSession(user.id);
      await audit(null, "auth.login", user.id);
      return json({ ok: true });
    }
    case "logout": {
      await destroySession();
      return json({ ok: true });
    }
    case "forgot": {
      rateLimit(`forgot:${ip}`, 5, 15 * 60_000);
      const body = await parseBody(req, forgotSchema);
      const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
      let sent = false;
      if (user) {
        const token = randomToken();
        await db.insert(authTokens).values({ userId: user.id, type: "reset", tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600_000) });
        sent = await sendEmail(
          user.email,
          "Reset your KRiXX AI password",
          `<p>Reset your password (valid for 1 hour):</p><p><a href="${appUrl(req)}/auth/reset?token=${token}">Choose a new password</a></p>`
        );
      }
      // Never reveal whether the account exists.
      return json({ ok: true, emailConfigured: !!process.env.RESEND_API_KEY || sent });
    }
    case "reset": {
      rateLimit(`reset:${ip}`, 10, 15 * 60_000);
      const body = await parseBody(req, resetSchema);
      const [tok] = await db
        .select()
        .from(authTokens)
        .where(and(eq(authTokens.tokenHash, sha256(body.token)), eq(authTokens.type, "reset"), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
        .limit(1);
      if (!tok) throw new HttpError(400, "This reset link is invalid or has expired.");
      await db.update(users).set({ passwordHash: await hashPassword(body.password), updatedAt: new Date() }).where(eq(users.id, tok.userId));
      await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, tok.id));
      await db.delete(sessions).where(eq(sessions.userId, tok.userId)); // sign out everywhere
      await createSession(tok.userId);
      return json({ ok: true });
    }
    default:
      throw new HttpError(404, "Not found");
  }
});

export const GET = handler(async (req: Request, { params }: { params: Promise<{ action: string }> }) => {
  const { action } = await params;
  const url = new URL(req.url);
  const base = appUrl(req);

  if (action === "verify") {
    const token = url.searchParams.get("token") ?? "";
    const [tok] = await db
      .select()
      .from(authTokens)
      .where(and(eq(authTokens.tokenHash, sha256(token)), eq(authTokens.type, "verify"), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
      .limit(1);
    if (!tok) return Response.redirect(`${base}/auth?error=verify`, 302);
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, tok.userId));
    await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, tok.id));
    return Response.redirect(`${base}/dashboard?verified=1`, 302);
  }

  if (action === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return Response.redirect(`${base}/auth?error=google_unconfigured`, 302);
    const state = randomToken(16);
    const p = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${base}/api/auth/google-callback`,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    const res = Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${p}`, 302);
    const headers = new Headers(res.headers);
    headers.append("set-cookie", `krixx_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
    return new Response(null, { status: 302, headers });
  }

  if (action === "google-callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieState = req.headers.get("cookie")?.match(/krixx_oauth_state=([^;]+)/)?.[1];
    if (!code || !state || state !== cookieState || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
      return Response.redirect(`${base}/auth?error=google`, 302);
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${base}/api/auth/google-callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return Response.redirect(`${base}/auth?error=google`, 302);
    const { access_token } = (await tokenRes.json()) as { access_token: string };
    const info = (await (await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${access_token}` } })).json()) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };
    if (!info.email || !info.email_verified) return Response.redirect(`${base}/auth?error=google`, 302);
    const email = info.email.toLowerCase();
    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      [user] = await db
        .insert(users)
        .values({ email, name: info.name ?? email.split("@")[0], googleId: info.sub, avatarUrl: info.picture, emailVerifiedAt: new Date() })
        .returning();
      await provisionWorkspace(user.id, (info.name ?? "My").split(" ")[0]);
    } else if (!user.googleId) {
      await db.update(users).set({ googleId: info.sub, emailVerifiedAt: user.emailVerifiedAt ?? new Date() }).where(eq(users.id, user.id));
    }
    await createSession(user.id);
    return Response.redirect(`${base}/dashboard`, 302);
  }

  throw new HttpError(404, "Not found");
});
