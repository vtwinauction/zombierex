import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/advertising")({
  head: () => ({ meta: [
    { title: "Advertising Policy · ZOMBIEREX" },
    { name: "description", content: "Rules for promoted posts, sponsored placements and business advertising on ZOMBIEREX." },
    { property: "og:title", content: "Advertising Policy · ZOMBIEREX" },
    { property: "og:description", content: "Standards for promoted and sponsored content." },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  return (
    <LegalShell title="Advertising Policy" updated="Effective: July 26, 2026">
      <h2>Scope</h2>
      <p>This policy applies to promoted posts, sponsored placements, business page campaigns
        and any paid promotion delivered through ZOMBIEREX.</p>

      <h2>Standards</h2>
      <ul>
        <li>Advertising must be truthful, substantiated and not misleading.</li>
        <li>Ads must be clearly distinguishable from organic content.</li>
        <li>No content promoting illegal street racing, reckless driving or unsafe modifications.</li>
        <li>No discriminatory targeting or prohibited product categories.</li>
        <li>Performance and dyno claims must state the measurement conditions.</li>
        <li>Landing pages must match the advertised offer and work on mobile.</li>
      </ul>

      <h2>Review and rejection</h2>
      <p>We may review, reject, pause or remove any campaign at our discretion, including after
        approval. Rejected campaigns are refunded for unspent budget.</p>

      <h2>Billing</h2>
      <p>Campaigns are billed on the model shown at purchase. Delivery metrics reported in the
        dashboard are the authoritative record for billing purposes.</p>

      <h2>Contact</h2>
      <p>Advertising enquiries: <a href="mailto:business@zombierex.com" className="underline">business@zombierex.com</a>.</p>
    </LegalShell>
  );
}
