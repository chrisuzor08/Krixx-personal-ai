import "server-only";
import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, subscriptions, users, workspaceMembers, workspaces } from "@/db/schema";

const scrypt = promisify(_scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
export const SESSION_COOKIE = "krixx_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [, salt, hex] = stored.split("$");
  if (!salt || !hex) return false;
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(hex, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export async function createSession(userId: string) {
  const token = randomToken();
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({
    id: sha256(token),
    userId,
    expiresAt,
    userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
  });
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  c.delete(SESSION_COOKIE);
}

export type SessionUser = typeof users.$inferSelect;

export async function getCurrentUser(): Promise<SessionUser | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
}

export type Role = "owner" | "admin" | "editor" | "viewer";
export type WorkspaceCtx = {
  user: SessionUser;
  workspace: typeof workspaces.$inferSelect;
  role: Role;
};

/** Creates the personal workspace + free subscription for a new user. */
export async function provisionWorkspace(userId: string, name: string) {
  const [ws] = await db
    .insert(workspaces)
    .values({ name: `${name || "My"}'s Workspace`, ownerId: userId })
    .returning();
  await db.insert(workspaceMembers).values({ workspaceId: ws.id, userId, role: "owner" });
  await db.insert(subscriptions).values({ workspaceId: ws.id, plan: "free" });
  return ws;
}

export async function getWorkspaceCtx(): Promise<WorkspaceCtx | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  let rows = await db
    .select({ workspace: workspaces, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, user.id))
    .limit(1);
  if (!rows[0]) {
    await provisionWorkspace(user.id, user.name);
    rows = await db
      .select({ workspace: workspaces, role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, user.id))
      .limit(1);
  }
  return { user, workspace: rows[0].workspace, role: rows[0].role as Role };
}

/** For server components/pages: redirect to /auth when unauthenticated. */
export async function requirePageCtx() {
  const ctx = await getWorkspaceCtx();
  if (!ctx) redirect("/auth");
  return ctx;
}

const RANK: Record<Role, number> = { viewer: 0, editor: 1, admin: 2, owner: 3 };
export const canEdit = (role: Role) => RANK[role] >= RANK.editor;
export const canAdmin = (role: Role) => RANK[role] >= RANK.admin;
