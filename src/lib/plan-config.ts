export type PlanId = "free" | "pro";

export const PLANS: Record<PlanId, {
  id: PlanId;
  name: string;
  price: string;
  tagline: string;
  available: boolean;
  limits: { agents: number; messages: number; knowledge: number };
  features: string[];
}> = {
  free: {
    id: "free",
    name: "Free",
    price: "$0",
    tagline: "Everything you need to build and ship your first agents.",
    available: true,
    limits: { agents: 3, messages: 500, knowledge: 5 },
    features: [
      "3 AI agents",
      "500 messages / month",
      "5 knowledge sources",
      "Agent Studio + 12 personality presets",
      "Streaming playground with debug mode",
      "Public share links",
      "Basic analytics",
      "No credit card required",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "Coming soon",
    tagline: "For creators and teams scaling serious AI agents.",
    available: false,
    limits: { agents: 25, messages: 10000, knowledge: 100 },
    features: [
      "Higher message limits",
      "More agents",
      "Larger knowledge bases",
      "Advanced workflows",
      "Premium AI models",
      "Extended analytics",
      "Custom branding",
      "API access",
    ],
  },
};
