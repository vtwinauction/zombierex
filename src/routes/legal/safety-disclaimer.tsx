import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/safety-disclaimer")({
  head: () => ({ meta: [
    { title: "Riding, Racing & Safety Disclaimer · ZOMBIEREX" },
    { name: "description", content: "Important safety information about motorsport risk, GPS timing accuracy, navigation and road-legal use of ZOMBIEREX features." },
    { property: "og:title", content: "Riding, Racing & Safety Disclaimer · ZOMBIEREX" },
    { property: "og:description", content: "Motorsport risk, GPS timing and navigation disclaimers." },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  return (
    <LegalShell title="Riding, Racing & Safety Disclaimer" updated="Effective: July 26, 2026">
      <p><strong>Read this before using performance, navigation or event features.</strong></p>

      <h2>Closed courses only</h2>
      <p>Performance recording, drag timing and competition features are intended for use on
        closed courses, sanctioned strips and private property only. Never use them on public
        roads. You are solely responsible for complying with all traffic and motorsport laws.</p>

      <h2>Assumption of risk</h2>
      <p>Motorcycling, motorsport and vehicle modification are inherently dangerous and can
        result in serious injury or death. You participate at your own risk. ZOMBIEREX does not
        organise, supervise, inspect or insure any activity recorded or arranged through the app.</p>

      <h2>Do not use while driving</h2>
      <p>Do not interact with the app while operating a vehicle. Mount devices securely, use
        hands-free operation, and have a passenger or crew operate recording features where possible.</p>

      <h2>GPS timing accuracy</h2>
      <p>Timing is derived from consumer GPS and device sensors. Results vary with satellite lock,
        weather, terrain and hardware, and are provided for entertainment and community comparison
        only. They are not certified timing and must not be used for official competition results,
        insurance claims or legal purposes.</p>

      <h2>Navigation and routes</h2>
      <p>Maps, routes and points of interest are community-contributed and may be inaccurate,
        outdated, seasonal, private or impassable. Always verify conditions, fuel range and
        access rights before riding, and follow all posted signage.</p>

      <h2>Events</h2>
      <p>Events are created by users, clubs and businesses. ZOMBIEREX does not verify permits,
        insurance, safety marshalling or medical cover. Confirm details directly with the organiser.</p>

      <h2>Emergency features</h2>
      <p>SOS and group tracking depend on network coverage, device battery and location permissions.
        They are not a substitute for emergency services. Always call your local emergency number first.</p>

      <h2>Limitation of liability</h2>
      <p>To the fullest extent permitted by law, ZOMBIEREX is not liable for injury, death,
        property damage, fines, or losses arising from use of the service or reliance on its data.</p>
    </LegalShell>
  );
}
