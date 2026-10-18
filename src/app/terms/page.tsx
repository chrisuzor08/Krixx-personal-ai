import { LegalPage } from "@/components/legal";

export const metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="2026">
      <section><h2>1. The service</h2><p>KRiXX AI provides tools to build, configure, train and deploy AI agents. By creating an account you agree to these terms.</p></section>
      <section><h2>2. Your account</h2><p>You are responsible for keeping your credentials secure and for all activity in your workspace. You must be at least 13 years old (or the age of digital consent in your country).</p></section>
      <section><h2>3. Acceptable use</h2><ul><li>No illegal, harmful, harassing, hateful or sexually exploitative content.</li><li>No attempts to bypass rate limits, plan limits or security controls.</li><li>No impersonation or deceptive agents designed to defraud users.</li><li>No uploading content you don&apos;t have the right to use.</li></ul></section>
      <section><h2>4. Your content</h2><p>You own the agents, knowledge sources and data you provide. You grant us a limited licence to process that content solely to operate the service for you.</p></section>
      <section><h2>5. AI output</h2><p>AI-generated responses may be inaccurate. You are responsible for reviewing outputs and for how your deployed agents are used by your audience.</p></section>
      <section><h2>6. Plans and limits</h2><p>The Free plan is provided at no cost with the limits shown on our pricing page. We may adjust limits with reasonable notice. Paid plans, when available, will be governed by additional billing terms.</p></section>
      <section><h2>7. Termination</h2><p>You can delete your account at any time from Settings. We may suspend accounts that violate these terms.</p></section>
      <section><h2>8. Disclaimer</h2><p>The service is provided &quot;as is&quot; without warranties of any kind, to the maximum extent permitted by law.</p></section>
    </LegalPage>
  );
}
