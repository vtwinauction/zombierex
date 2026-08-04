import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/creator-terms")({
  head: () => ({
    meta: [
      { title: "Creator & Monetisation Terms · ZOMBIEREX" },
      {
        name: "description",
        content:
          "Eligibility, payouts, sponsorship disclosure and content obligations for ZOMBIEREX creators.",
      },
      { property: "og:title", content: "Creator & Monetisation Terms · ZOMBIEREX" },
      { property: "og:description", content: "Creator eligibility, payouts and obligations." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalShell title="Creator & Monetisation Terms" updated="Effective: July 26, 2026">
      <h2>Eligibility</h2>
      <p>
        Creators must be 18 or older, maintain an account in good standing, comply with the
        Acceptable Use Policy, and complete identity and payout verification before earning.
      </p>

      <h2>Content ownership</h2>
      <p>
        You keep ownership of your content. You grant ZOMBIEREX a worldwide, non-exclusive,
        royalty-free licence to host, reproduce, adapt for formatting, and display your content for
        operating and promoting the service. You may revoke this by deleting the content.
      </p>

      <h2>Earnings and payouts</h2>
      <ul>
        <li>
          Earnings accrue from sponsorships, tips, subscriptions, ticketed events and approved
          collaborations.
        </li>
        <li>ZOMBIEREX retains its published commission on each monetised transaction.</li>
        <li>Payouts are issued after the holding period once the minimum threshold is met.</li>
        <li>Fraudulent engagement voids the associated earnings.</li>
      </ul>

      <h2>Sponsorship disclosure</h2>
      <p>
        Paid partnerships, gifted products and affiliate links must be disclosed clearly in the post
        using the built-in disclosure tools, as required by advertising regulators.
      </p>

      <h2>Suspension</h2>
      <p>
        We may pause monetisation for policy violations, unresolved disputes, incomplete tax
        information, or suspected fraud, and may recover incorrectly paid amounts.
      </p>
    </LegalShell>
  );
}
