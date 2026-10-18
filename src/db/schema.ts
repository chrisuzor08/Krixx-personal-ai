import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const ts = () => timestamp({ withTimezone: true }).defaultNow().notNull();

/* ───────────── Identity ───────────── */

export const users = pgTable(
  "profiles",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    name: text().notNull().default(""),
    passwordHash: text("password_hash"),
    googleId: text("google_id"),
    avatarUrl: text("avatar_url"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: ts(),
    updatedAt: ts(),
  },
  (t) => [uniqueIndex("profiles_email_idx").on(t.email)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: text().primaryKey(), // sha256 of the session token
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: ts(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

export const authTokens = pgTable("auth_tokens", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text().notNull(), // reset | verify
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: ts(),
});

/* ───────────── Workspaces ───────────── */

export const workspaces = pgTable("workspaces", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: text().notNull().default("free"),
  createdAt: ts(),
  updatedAt: ts(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text().notNull().default("owner"), // owner | admin | editor | viewer
    createdAt: ts(),
  },
  (t) => [uniqueIndex("ws_member_unique").on(t.workspaceId, t.userId), index("ws_member_user_idx").on(t.userId)]
);

export const subscriptions = pgTable("subscriptions", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  plan: text().notNull().default("free"),
  status: text().notNull().default("active"),
  provider: text(), // e.g. stripe / paystack (future)
  providerRef: text("provider_ref"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).defaultNow().notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: ts(),
});

/* ───────────── Agents ───────────── */

export const agentTemplates = pgTable("agent_templates", {
  id: text().primaryKey(),
  name: text().notNull(),
  description: text().notNull(),
  systemPrompt: text("system_prompt").notNull(),
  createdAt: ts(),
});

export const agents = pgTable(
  "agents",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    name: text().notNull(),
    slug: text().notNull(),
    description: text().notNull().default(""),
    avatar: text().notNull().default("🤖"),
    avatarColor: text("avatar_color").notNull().default("#8B5CF6"),
    templateId: text("template_id").notNull().default("custom"),
    status: text().notNull().default("draft"), // draft | published | archived
    visibility: text().notNull().default("private"), // private | public
    createdAt: ts(),
    updatedAt: ts(),
  },
  (t) => [uniqueIndex("agents_slug_idx").on(t.slug), index("agents_ws_idx").on(t.workspaceId)]
);

export type WidgetConfig = {
  primaryColor: string;
  position: "right" | "left";
  launcherIcon: string;
  headerText: string;
  width: number;
  height: number;
  showBranding: boolean;
};

export const agentSettings = pgTable("agent_settings", {
  agentId: uuid("agent_id")
    .primaryKey()
    .references(() => agents.id, { onDelete: "cascade" }),
  personality: text().notNull().default(""),
  communicationStyle: text("communication_style").notNull().default("friendly"),
  responseLength: text("response_length").notNull().default("balanced"),
  temperature: real().notNull().default(0.7),
  primaryLanguage: text("primary_language").notNull().default("English"),
  supportedLanguages: jsonb("supported_languages").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  welcomeMessage: text("welcome_message").notNull().default(""),
  suggestedPrompts: jsonb("suggested_prompts").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  systemPrompt: text("system_prompt").notNull().default(""),
  customInstructions: text("custom_instructions").notNull().default(""),
  model: text().notNull().default("krixx-lite"),
  fallbackModel: text("fallback_model"),
  maxTokens: integer("max_tokens").notNull().default(800),
  contextMessages: integer("context_messages").notNull().default(12),
  responseFormat: text("response_format").notNull().default("markdown"),
  fallbackMessage: text("fallback_message")
    .notNull()
    .default("I'm not certain about that based on what I know. Could you rephrase, or ask something else?"),
  hallucinationGuard: boolean("hallucination_guard").notNull().default(true),
  memoryEnabled: boolean("memory_enabled").notNull().default(true),
  memoryDays: integer("memory_days").notNull().default(30),
  useKnowledge: boolean("use_knowledge").notNull().default(true),
  knowledgeThreshold: real("knowledge_threshold").notNull().default(0.05),
  widget: jsonb().$type<WidgetConfig>(),
  updatedAt: ts(),
});

/* ───────────── Conversations ───────────── */

export const conversations = pgTable(
  "conversations",
  {
    id: uuid().primaryKey().defaultRandom(),
    agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    visitorId: text("visitor_id"),
    source: text().notNull().default("playground"), // playground | public | widget
    title: text().notNull().default("New conversation"),
    createdAt: ts(),
    updatedAt: ts(),
  },
  (t) => [index("conv_agent_idx").on(t.agentId), index("conv_ws_idx").on(t.workspaceId)]
);

export type SourceRef = { sourceId: string; name: string; snippet: string; score: number };

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    role: text().notNull(), // user | assistant
    content: text().notNull(),
    model: text(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    latencyMs: integer("latency_ms"),
    sources: jsonb().$type<SourceRef[]>(),
    error: text(),
    createdAt: ts(),
  },
  (t) => [index("msg_conv_idx").on(t.conversationId, t.createdAt)]
);

/* ───────────── Knowledge ───────────── */

export const knowledgeSources = pgTable(
  "knowledge_sources",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "cascade" }),
    name: text().notNull(),
    type: text().notNull(), // text | url | txt | md | csv
    url: text(),
    rawText: text("raw_text").notNull().default(""),
    status: text().notNull().default("processing"), // processing | ready | failed
    enabled: boolean().notNull().default(true),
    charCount: integer("char_count").notNull().default(0),
    chunkCount: integer("chunk_count").notNull().default(0),
    error: text(),
    createdAt: ts(),
    updatedAt: ts(),
  },
  (t) => [index("ks_ws_idx").on(t.workspaceId), index("ks_agent_idx").on(t.agentId)]
);

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid().primaryKey().defaultRandom(),
    sourceId: uuid("source_id").notNull().references(() => knowledgeSources.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    idx: integer().notNull(),
    content: text().notNull(),
    createdAt: ts(),
  },
  (t) => [
    index("kc_source_idx").on(t.sourceId),
    index("kc_fts_idx").using("gin", sql`to_tsvector('english', ${t.content})`),
  ]
);

/* ───────────── Usage, safety, audit ───────────── */

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    kind: text().notNull().default("message"),
    period: text().notNull(), // YYYY-MM — monthly reset key
    model: text(),
    tokens: integer().notNull().default(0),
    latencyMs: integer("latency_ms"),
    success: boolean().notNull().default(true),
    createdAt: ts(),
  },
  (t) => [index("usage_ws_period_idx").on(t.workspaceId, t.period)]
);

export const reports = pgTable("reports", {
  id: uuid().primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "set null" }),
  reason: text().notNull(),
  details: text().notNull().default(""),
  status: text().notNull().default("open"),
  createdAt: ts(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text().notNull(),
    target: text(),
    meta: jsonb().$type<Record<string, unknown>>(),
    createdAt: ts(),
  },
  (t) => [index("audit_ws_idx").on(t.workspaceId, t.createdAt)]
);

/* ───────────── Integrations & workflows (schema ready for phases 5–6) ───────────── */

export const integrations = pgTable("integrations", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  provider: text().notNull(),
  status: text().notNull().default("disconnected"),
  enabled: boolean().notNull().default(false),
  config: jsonb().$type<Record<string, unknown>>(),
  encryptedCredentials: text("encrypted_credentials"),
  lastError: text("last_error"),
  createdAt: ts(),
  updatedAt: ts(),
});

export const workflows = pgTable("workflows", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text().notNull(),
  description: text().notNull().default(""),
  status: text().notNull().default("draft"),
  createdAt: ts(),
  updatedAt: ts(),
});

export const workflowNodes = pgTable("workflow_nodes", {
  id: uuid().primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  type: text().notNull(),
  label: text().notNull().default(""),
  config: jsonb().$type<Record<string, unknown>>(),
  positionX: real("position_x").notNull().default(0),
  positionY: real("position_y").notNull().default(0),
});

export const workflowEdges = pgTable("workflow_edges", {
  id: uuid().primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  sourceNodeId: uuid("source_node_id").notNull().references(() => workflowNodes.id, { onDelete: "cascade" }),
  targetNodeId: uuid("target_node_id").notNull().references(() => workflowNodes.id, { onDelete: "cascade" }),
  label: text(),
});

export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid().primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  status: text().notNull().default("pending"),
  logs: jsonb().$type<unknown[]>(),
  startedAt: ts(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});
