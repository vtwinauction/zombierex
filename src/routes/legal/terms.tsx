import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({ meta: [
    { title: "Terms of Service · ZOMBIEREX" },
    { name: "description", content: "The rules for using ZOMBIEREX — the social platform for motorcycle and automotive riders." },
    { property: "og:title", content: "Terms of Service · ZOMBIEREX" },
    { property: "og:description", content: "The rules for using ZOMBIEREX." },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="Effective: July 26, 2026">
      <p>
        These Terms of Service ("Terms") govern your access to and use of ZOMBIEREX, a
        social platform for motorcycle and automotive enthusiasts (the "Service"). By
        creating an account or using the Service you agree to these Terms.
      </p>

      <h2>1. Eligibility</h2>
      <p>You must be at least 13 years old to use the Service. If you are under the age
        of majority in your jurisdiction, you may only use the Service with the consent
        of a parent or legal guardian.</p>

      <h2>2. Your account</h2>
      <p>You are responsible for the security of your account credentials and for all
        activity that occurs under your account. Notify us immediately of any
        unauthorized access.</p>

      <h2>3. Acceptable use</h2>
      <p>You agree not to use the Service to (a) violate any law; (b) infringe intellectual
        property or privacy rights; (c) harass, threaten, or dox any person; (d) post
        content that is unlawful, hateful, sexually explicit, or promotes self-harm;
        (e) attempt to scrape, reverse-engineer, or disrupt the Service; or (f) submit
        falsified racing, telemetry, or judging data. See our{" "}
        <Link to="/legal/community-guidelines" className="underline">Community Guidelines</Link>.</p>

      <h2>4. User content</h2>
      <p>You retain ownership of content you post. You grant ZOMBIEREX a worldwide,
        non-exclusive, royalty-free license to host, display, reproduce, modify (for
        formatting), and distribute that content as required to operate the Service.
        You represent that you have all rights necessary to grant this license.</p>

      <h2>5. Riding, racing & GPS features</h2>
      <p>Route planning, group ride tracking, drag racing timing, and telemetry are
        provided for informational and entertainment purposes only. You are solely
        responsible for operating your vehicle safely and in compliance with all
        applicable laws. Do not interact with the app while riding or driving. Racing
        features are intended for closed courses and private property only.</p>

      <h2>6. Marketplace & payments</h2>
      <p>ZOMBIEREX may facilitate listings and transactions between riders and vendors.
        We are not a party to those transactions and make no warranty regarding
        listed items. All sales are between buyer and seller.</p>

      <h2>7. Subscriptions</h2>
      <p>Paid subscriptions auto-renew until cancelled. You may cancel at any time
        through your account settings or your app store. Refunds are handled per
        the applicable store's policy.</p>

      <h2>8. Termination</h2>
      <p>You may delete your account at any time from{" "}
        <span className="underline">Settings → Delete account</span>. We may suspend
        or terminate accounts that violate these Terms.</p>

      <h2>9. Disclaimers</h2>
      <p>The Service is provided "as is" without warranties of any kind. To the maximum
        extent permitted by law, ZOMBIEREX disclaims all implied warranties.</p>

      <h2>10. Limitation of liability</h2>
      <p>To the maximum extent permitted by law, ZOMBIEREX shall not be liable for any
        indirect, incidental, special, or consequential damages arising from your use
        of the Service.</p>

      <h2>11. Changes</h2>
      <p>We may update these Terms; material changes will be announced in-app. Continued
        use of the Service after changes take effect constitutes acceptance.</p>

      <h2>12. Contact</h2>
      <p>Questions? Contact <a href="mailto:legal@zombierex.com" className="underline">legal@zombierex.com</a>.</p>
    </LegalShell>
  );
}
