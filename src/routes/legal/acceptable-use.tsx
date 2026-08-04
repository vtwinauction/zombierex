import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/acceptable-use")({
  head: () => ({
    meta: [
      { title: "Acceptable Use Policy · ZOMBIEREX" },
      {
        name: "description",
        content: "What is allowed and prohibited on ZOMBIEREX, and how violations are enforced.",
      },
      { property: "og:title", content: "Acceptable Use Policy · ZOMBIEREX" },
      { property: "og:description", content: "Prohibited conduct and enforcement on ZOMBIEREX." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalShell title="Acceptable Use Policy" updated="Effective: July 26, 2026">
      <p>
        This policy supplements the Terms of Service and applies to all content, messages, listings,
        events and profiles on ZOMBIEREX.
      </p>

      <h2>Prohibited content and conduct</h2>
      <ul>
        <li>
          Illegal street racing organisation, or content encouraging dangerous driving on public
          roads.
        </li>
        <li>Harassment, hate speech, threats, doxxing or targeted abuse.</li>
        <li>
          Sexual content, graphic violence, or content involving minors in any unsafe context.
        </li>
        <li>Fraud, scams, counterfeit parts, stolen vehicles, or misrepresented listings.</li>
        <li>
          Sale of prohibited items: weapons, drugs, emissions-defeat devices where illegal, or
          safety-critical counterfeit parts.
        </li>
        <li>Impersonation, fake verification claims or manipulated performance results.</li>
        <li>Spam, bulk automation, scraping, or artificial engagement.</li>
        <li>Malware, exploits, or attempts to bypass rate limits and access controls.</li>
      </ul>

      <h2>Performance and racing integrity</h2>
      <p>
        Falsifying GPS runs, tampering with recorded telemetry, or submitting results recorded by
        another person is a serious violation and may result in permanent removal of records and
        account termination.
      </p>

      <h2>Enforcement</h2>
      <p>
        Depending on severity and history we may remove content, restrict features, withhold
        monetisation, suspend or permanently terminate accounts, and where required report activity
        to law enforcement.
      </p>

      <h2>Appeals</h2>
      <p>
        You may appeal an enforcement decision by contacting
        <a href="mailto:support@zombierex.com" className="underline">
          {" "}
          support@zombierex.com
        </a>{" "}
        within 30 days.
      </p>
    </LegalShell>
  );
}
