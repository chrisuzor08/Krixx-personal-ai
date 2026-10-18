import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required").max(200),
});
export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email") });
export const resetSchema = z.object({ token: z.string().min(10), password: z.string().min(8, "Password must be at least 8 characters").max(200) });

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #8B5CF6");

export const widgetSchema = z.object({
  primaryColor: hex,
  position: z.enum(["right", "left"]),
  launcherIcon: z.string().max(8),
  headerText: z.string().max(60),
  width: z.number().int().min(300).max(520),
  height: z.number().int().min(400).max(760),
  showBranding: z.boolean(),
});

export const agentUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(60),
    description: z.string().max(300),
    avatar: z.string().min(1).max(8),
    avatarColor: hex,
    templateId: z.string().max(40),
    visibility: z.enum(["private", "public"]),
    status: z.enum(["draft", "published", "archived"]),
    personality: z.string().max(300),
    communicationStyle: z.string().max(40),
    responseLength: z.enum(["concise", "balanced", "detailed"]),
    temperature: z.number().min(0).max(1.5),
    primaryLanguage: z.string().max(40),
    supportedLanguages: z.array(z.string().max(40)).max(15),
    welcomeMessage: z.string().max(500),
    suggestedPrompts: z.array(z.string().trim().min(1).max(120)).max(6),
    systemPrompt: z.string().max(6000),
    customInstructions: z.string().max(4000),
    model: z.string().max(60),
    fallbackModel: z.string().max(60).nullable(),
    maxTokens: z.number().int().min(64).max(4096),
    contextMessages: z.number().int().min(0).max(50),
    responseFormat: z.enum(["markdown", "plain"]),
    fallbackMessage: z.string().max(500),
    hallucinationGuard: z.boolean(),
    memoryEnabled: z.boolean(),
    memoryDays: z.number().int().min(1).max(365),
    useKnowledge: z.boolean(),
    knowledgeThreshold: z.number().min(0).max(1),
    widget: widgetSchema,
  })
  .partial();
export type AgentUpdate = z.infer<typeof agentUpdateSchema>;

export const agentCreateSchema = z.object({
  templateId: z.string().max(40).default("custom"),
  name: z.string().trim().min(1).max(60).optional(),
});

export const chatSchema = z.object({
  agentId: z.string().uuid().optional(),
  slug: z.string().max(80).optional(),
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().trim().min(1, "Message is empty").max(8000, "Message is too long"),
  attachment: z.object({ name: z.string().max(120), content: z.string().max(60000) }).nullable().optional(),
  regenerate: z.boolean().optional(),
  visitorId: z.string().max(64).optional(),
  modelOverride: z.string().max(60).optional(),
});

export const knowledgeCreateSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), name: z.string().trim().min(1).max(120), content: z.string().min(20, "Add at least 20 characters").max(400_000), agentId: z.string().uuid().nullable().optional() }),
  z.object({ type: z.enum(["txt", "md", "csv"]), name: z.string().trim().min(1).max(120), content: z.string().min(1).max(400_000), agentId: z.string().uuid().nullable().optional() }),
  z.object({ type: z.literal("url"), url: z.string().url("Enter a valid URL").max(2000), name: z.string().max(120).optional(), agentId: z.string().uuid().nullable().optional() }),
]);

export const knowledgeUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  enabled: z.boolean().optional(),
  reindex: z.boolean().optional(),
  agentId: z.string().uuid().nullable().optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  workspaceName: z.string().trim().min(1).max(80).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(8).max(200).optional(),
});

export const reportSchema = z.object({
  slug: z.string().max(80).optional(),
  agentId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  reason: z.enum(["harmful", "inaccurate", "spam", "privacy", "other"]),
  details: z.string().max(1000).default(""),
});
