import "server-only";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeChunks, knowledgeSources, type SourceRef } from "@/db/schema";

export const MAX_SOURCE_CHARS = 400_000;
const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 150;

export function normalizeText(raw: string) {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Paragraph-aware chunking with overlap so semantic units stay together. */
export function chunkText(text: string): string[] {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let cur = "";
  const push = () => {
    if (cur.trim()) chunks.push(cur.trim());
  };
  for (const p of paras) {
    if (p.length > CHUNK_SIZE) {
      push();
      cur = "";
      for (let i = 0; i < p.length; i += CHUNK_SIZE - CHUNK_OVERLAP) chunks.push(p.slice(i, i + CHUNK_SIZE));
      continue;
    }
    if ((cur + "\n\n" + p).length > CHUNK_SIZE) {
      push();
      cur = cur.slice(-CHUNK_OVERLAP) + "\n\n" + p;
    } else cur = cur ? cur + "\n\n" + p : p;
  }
  push();
  return chunks.slice(0, 2000);
}

export function htmlToText(html: string) {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isPrivateHost(host: string) {
  return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|\[?::1\]?)/i.test(host) || host.endsWith(".internal") || host.endsWith(".local");
}

/** Fetch a public web page safely (SSRF guard, size + time limits). */
export async function fetchUrlText(url: string) {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol) || isPrivateHost(u.hostname)) throw new Error("URL not allowed");
  const res = await fetch(u, { signal: AbortSignal.timeout(15_000), redirect: "follow", headers: { "user-agent": "KRiXX-AI-Indexer/1.0" } });
  if (!res.ok) throw new Error(`Fetch failed (HTTP ${res.status})`);
  const type = res.headers.get("content-type") ?? "";
  const body = (await res.text()).slice(0, 2_000_000);
  const title = body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
  return { text: type.includes("html") ? htmlToText(body) : body, title };
}

/** Index (or re-index) a source: normalize → chunk → store. Lexical vectors are maintained by a GIN tsvector index. */
export async function indexSource(sourceId: string) {
  const [src] = await db.select().from(knowledgeSources).where(eq(knowledgeSources.id, sourceId));
  if (!src) return;
  try {
    let raw = src.rawText;
    if (src.type === "url" && src.url) {
      const r = await fetchUrlText(src.url);
      raw = r.text;
    }
    const text = normalizeText(raw).slice(0, MAX_SOURCE_CHARS);
    if (text.length < 20) throw new Error("Not enough readable text found");
    const chunks = chunkText(text);
    await db.transaction(async (tx) => {
      await tx.delete(knowledgeChunks).where(eq(knowledgeChunks.sourceId, src.id));
      for (let i = 0; i < chunks.length; i += 200) {
        await tx.insert(knowledgeChunks).values(
          chunks.slice(i, i + 200).map((content, j) => ({ sourceId: src.id, workspaceId: src.workspaceId, idx: i + j, content }))
        );
      }
      await tx
        .update(knowledgeSources)
        .set({ status: "ready", error: null, rawText: src.type === "url" ? "" : text, charCount: text.length, chunkCount: chunks.length, updatedAt: new Date() })
        .where(eq(knowledgeSources.id, src.id));
    });
  } catch (e) {
    await db
      .update(knowledgeSources)
      .set({ status: "failed", error: e instanceof Error ? e.message.slice(0, 200) : "Processing failed", updatedAt: new Date() })
      .where(eq(knowledgeSources.id, src.id));
  }
}

/** Ranked retrieval over enabled sources available to the agent (agent-scoped + workspace-wide). */
export async function retrieve(workspaceId: string, agentId: string, query: string, threshold: number, k = 4): Promise<(SourceRef & { content: string })[]> {
  const terms = [...new Set((query.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []).slice(0, 24))];
  if (!terms.length) return [];
  const tsq = terms.map((t) => t.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean).join(" | ");
  if (!tsq) return [];
  const srcs = await db
    .select({ id: knowledgeSources.id, name: knowledgeSources.name })
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.workspaceId, workspaceId),
        eq(knowledgeSources.enabled, true),
        eq(knowledgeSources.status, "ready"),
        or(eq(knowledgeSources.agentId, agentId), isNull(knowledgeSources.agentId))
      )
    );
  if (!srcs.length) return [];
  const names = new Map(srcs.map((s) => [s.id, s.name]));
  const rank = sql<number>`ts_rank_cd(to_tsvector('english', ${knowledgeChunks.content}), to_tsquery('english', ${tsq}), 32)`;
  const rows = await db
    .select({ sourceId: knowledgeChunks.sourceId, content: knowledgeChunks.content, score: rank })
    .from(knowledgeChunks)
    .where(and(inArray(knowledgeChunks.sourceId, [...names.keys()]), sql`to_tsvector('english', ${knowledgeChunks.content}) @@ to_tsquery('english', ${tsq})`))
    .orderBy(sql`${rank} desc`)
    .limit(k);
  return rows
    .filter((r) => Number(r.score) >= threshold)
    .map((r) => ({
      sourceId: r.sourceId,
      name: names.get(r.sourceId) ?? "Source",
      content: r.content,
      snippet: r.content.slice(0, 220),
      score: Math.round(Number(r.score) * 1000) / 1000,
    }));
}
