import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/marketplace-terms")({
  head: () => ({
    meta: [
      { title: "Marketplace Terms · ZOMBIEREX" },
      {
        name: "description",
        content:
          "Rules for buying and selling vehicles, parts and gear on the ZOMBIEREX marketplace.",
      },
      { property: "og:title", content: "Marketplace Terms · ZOMBIEREX" },
      {
        property: "og:description",
        content: "Listing rules, buyer and seller obligations, and dispute handling.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalShell title="Marketplace Terms" updated="Effective: July 26, 2026">
      <p>
        These terms apply whenever you list, buy or sell on ZOMBIEREX. ZOMBIEREX is a venue
        connecting buyers and sellers; unless expressly stated, we are not a party to the
        transaction and do not own the items listed.
      </p>

      <h2>Seller obligations</h2>
      <ul>
        <li>
          You must own or be authorised to sell the item, and it must be legal to sell in your
          jurisdiction.
        </li>
        <li>
          Listings must be accurate: condition, mileage, accident history, modifications and
          defects.
        </li>
        <li>Photos must be of the actual item. Stock images must be labelled as such.</li>
        <li>Prices must include mandatory fees; bait pricing is prohibited.</li>
        <li>
          You are responsible for taxes, registration transfers, export rules and shipping
          compliance.
        </li>
      </ul>

      <h2>Buyer obligations</h2>
      <ul>
        <li>Inspect vehicles and high-value parts before purchase where practical.</li>
        <li>Complete payment through supported channels; off-platform payments are unprotected.</li>
        <li>Report suspected fraud within 48 hours of discovery.</li>
      </ul>

      <h2>Prohibited items</h2>
      <p>
        Stolen goods, cloned or tampered VINs, counterfeit safety-critical parts, weapons, illegal
        emissions-defeat devices, and any item restricted by applicable law.
      </p>

      <h2>Fees</h2>
      <p>
        Sellers pay a platform commission and applicable payment processing fees on completed sales.
        Current rates are shown before you publish a listing and in
        <a href="/legal/payments-refunds" className="underline">
          {" "}
          Payments, Fees &amp; Refunds
        </a>
        .
      </p>

      <h2>Disputes</h2>
      <p>
        Buyers and sellers should first resolve issues directly. If that fails, open a dispute in
        the order screen within 14 days of delivery. ZOMBIEREX may mediate, hold settlement funds,
        reverse a payout, or remove listings and accounts.
      </p>

      <h2>No warranty</h2>
      <p>
        Items are sold as-is by third parties. ZOMBIEREX makes no warranty as to condition,
        legality, roadworthiness or fitness for purpose.
      </p>
    </LegalShell>
  );
}
