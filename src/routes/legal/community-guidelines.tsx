import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/community-guidelines")({
  head: () => ({ meta: [
    { title: "Community Guidelines · ZOMBIEREX" },
    { name: "description", content: "What is and isn't allowed on ZOMBIEREX." },
    { property: "og:title", content: "Community Guidelines · ZOMBIEREX" },
    { property: "og:description", content: "Our rules for a safe, respectful riding community." },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: GuidelinesPage,
});

function GuidelinesPage() {
  return (
    <LegalShell title="Community Guidelines" updated="Effective: July 26, 2026">
      <p>ZOMBIEREX is built for riders. To keep it a place worth returning to,
        every member is expected to follow these guidelines. Violations may lead to
        content removal, temporary suspensions, or permanent bans.</p>

      <h2>Zero tolerance</h2>
      <ul>
        <li>Threats, harassment, doxxing, or targeted hate against any person or group.</li>
        <li>Content that sexualizes minors — reported immediately to authorities.</li>
        <li>Content that promotes or glorifies suicide, self-harm, or eating disorders.</li>
        <li>Terrorist content, organized violence, or credible threats.</li>
        <li>Non-consensual intimate imagery.</li>
      </ul>

      <h2>Riding safely</h2>
      <ul>
        <li>Don't post content that endangers other road users (wheelies through
          traffic, wrong-way riding, filming while distracted).</li>
        <li>Racing content must be on closed courses, private property, or clearly
          simulated. Public-road drag racing submissions will be rejected.</li>
        <li>Never interact with the app while operating a vehicle.</li>
      </ul>

      <h2>Authenticity</h2>
      <ul>
        <li>Don't impersonate other riders, brands, or ZOMBIEREX staff.</li>
        <li>Don't manipulate drag racing timing, judging results, or telemetry.</li>
        <li>Don't spam, run engagement bots, or artificially inflate metrics.</li>
      </ul>

      <h2>Marketplace integrity</h2>
      <ul>
        <li>List only items you own and can legally sell.</li>
        <li>Photos must be of the actual item; describe condition truthfully.</li>
        <li>No counterfeit parts, stolen vehicles, or items that violate any law.</li>
      </ul>

      <h2>Reporting</h2>
      <p>See something that breaks these rules? Tap the ⋯ menu on any post, profile,
        or message and choose <strong>Report</strong>. Reports are reviewed by our
        moderation team. Repeated false reports may themselves be a violation.</p>

      <h2>Appeals</h2>
      <p>If we act on your content or account and you believe we made a mistake, you
        may appeal through <span className="underline">Settings → Report a problem</span>.</p>
    </LegalShell>
  );
}
