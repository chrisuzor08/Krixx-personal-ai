import { LegalPage } from "@/components/legal";

export const metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="2026">
      <section><h2>What we collect</h2><ul><li>Account data: name, email, hashed password or Google account ID.</li><li>Workspace content: agents, settings, knowledge sources and conversations.</li><li>Usage data: message counts, token counts, latency and errors for limits and analytics.</li></ul></section>
      <section><h2>How we use it</h2><p>Only to operate, secure and improve KRiXX AI for you. We do not sell personal data. Your private agents, knowledge and conversations are isolated to your workspace and never visible to other users.</p></section>
      <section><h2>AI providers</h2><p>When your agent uses a third-party model (e.g. OpenAI, Google, Anthropic), the conversation context and retrieved knowledge excerpts are sent to that provider to generate a response. API keys are stored server-side only.</p></section>
      <section><h2>Public agents</h2><p>Visitors chatting with your published agent are identified by a random anonymous ID stored in their browser. Their conversations are visible to you, the agent owner.</p></section>
      <section><h2>Retention & deletion</h2><p>Conversation memory windows are configurable per agent. You can delete individual conversations, knowledge sources, agents, or your entire account at any time; deletion cascades to all associated data.</p></section>
      <section><h2>Security</h2><p>Passwords are hashed with scrypt; sessions use random tokens stored only as SHA-256 hashes; all data access is authorized server-side against your workspace membership.</p></section>
      <section><h2>Contact</h2><p>Questions about privacy? Reach the team through the contact details on our website.</p></section>
    </LegalPage>
  );
}
