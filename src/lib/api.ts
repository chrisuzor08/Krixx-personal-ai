import "server-only";
import { ZodError, type ZodType } from "zod";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { canEdit, getWorkspaceCtx, type WorkspaceCtx } from "./auth";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export const json = (data: unknown, status = 200) => Response.json(data, { status });

/** Wraps a route handler with consistent, non-leaky error handling. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status);
      if (e instanceof ZodError)
        return json({ error: e.issues[0]?.message ?? "Invalid input", issues: e.issues }, 400);
      console.error("[api]", e);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  };
}

const MAX_BODY = 1_000_000; // 1MB request size limit

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) throw new HttpError(413, "Request too large");
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, "Request too large");
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
  return schema.parse(data);
}

export async function requireCtx(opts: { edit?: boolean } = {}): Promise<WorkspaceCtx> {
  const ctx = await getWorkspaceCtx();
  if (!ctx) throw new HttpError(401, "Please sign in");
  if (opts.edit && !canEdit(ctx.role)) throw new HttpError(403, "You don't have permission to do that");
  return ctx;
}

/* ── In-memory sliding-window rate limiter (per instance). Swap for Redis in multi-instance deploys. ── */
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) throw new HttpError(429, "Too many requests — please slow down.", "rate_limited");
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 10_000) buckets.clear();
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export async function audit(ctx: Pick<WorkspaceCtx, "user" | "workspace"> | null, action: string, target?: string, meta?: Record<string, unknown>) {
  try {
    await db.insert(auditLogs).values({
      workspaceId: ctx?.workspace.id ?? null,
      userId: ctx?.user.id ?? null,
      action,
      target,
      meta,
    });
  } catch (e) {
    console.error("[audit]", e);
  }
}
