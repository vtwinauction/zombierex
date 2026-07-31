import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/payments-refunds")({
  head: () => ({ meta: [
    { title: "Payments, Fees & Refunds · ZOMBIEREX" },
    { name: "description", content: "Commission rates, settlements, refunds, chargebacks and payout schedules on ZOMBIEREX." },
    { property: "og:title", content: "Payments, Fees & Refunds · ZOMBIEREX" },
    { property: "og:description", content: "Commission, settlements, refunds and chargebacks." },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  return (
    <LegalShell title="Payments, Fees & Refunds" updated="Effective: July 26, 2026">
      <h2>Fees</h2>
      <p>ZOMBIEREX charges a platform commission on completed marketplace sales, ticketed
        events and monetised creator transactions. The applicable rate is displayed before
        you confirm a listing, ticket or payout arrangement. Payment processing fees charged
        by our providers are passed through and shown separately.</p>

      <h2>Settlements and payouts</h2>
      <p>Seller and creator balances are settled to the payout method on file after any
        applicable holding period, which allows time for disputes and fraud checks. Payouts
        may be delayed or withheld where identity verification is incomplete, where a dispute
        is open, or where required by law.</p>

      <h2>Refunds</h2>
      <ul>
        <li><strong>Digital goods and boosts</strong> — refundable only where the service was not delivered.</li>
        <li><strong>Event tickets</strong> — governed by the organiser's stated policy; cancelled events are refunded in full.</li>
        <li><strong>Marketplace orders</strong> — refunds are agreed between buyer and seller, or determined through the dispute process.</li>
      </ul>
      <p>Approved refunds are returned to the original payment method. Platform commission is
        reversed proportionally on refunded amounts.</p>

      <h2>Chargebacks</h2>
      <p>If a payment is reversed by a card issuer, the associated payout may be debited from
        the seller's balance. Repeated chargebacks may result in restricted selling privileges.</p>

      <h2>Taxes</h2>
      <p>You are responsible for determining and paying any taxes arising from your sales,
        ticket revenue or creator earnings. Where required, we collect tax information and
        report earnings to the relevant authorities.</p>

      <h2>Currencies</h2>
      <p>Prices are shown in the currency selected by the seller or organiser. Conversion rates
        and cross-border fees are set by your payment provider.</p>
    </LegalShell>
  );
}
