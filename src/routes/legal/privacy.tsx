import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · ZOMBIEREX" },
      { name: "description", content: "How ZOMBIEREX collects, uses, and protects your data." },
      { property: "og:title", content: "Privacy Policy · ZOMBIEREX" },
      { property: "og:description", content: "How ZOMBIEREX handles your data." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="Effective: July 26, 2026">
      <p>
        This Privacy Policy explains what personal information ZOMBIEREX collects, how we use it,
        and the choices you have.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong>: email, display name, handle, date of birth (for age
          verification), avatar.
        </li>
        <li>
          <strong>Content you post</strong>: posts, reels, comments, ride logs, listings, messages.
        </li>
        <li>
          <strong>Location data</strong>: precise GPS while using Route Atlas, Group Rides, Drag
          Racing, or SOS. Background location is only collected when you start a ride or race and
          can be stopped at any time.
        </li>
        <li>
          <strong>Device data</strong>: device model, OS version, app version, push tokens, crash
          logs.
        </li>
        <li>
          <strong>Vehicle telemetry</strong>: optional OBD-II readings you connect.
        </li>
        <li>
          <strong>Payment data</strong>: handled by our payment processor; we store only the last
          four digits and a token.
        </li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>Provide, maintain, and improve the Service.</li>
        <li>Personalize your feed, recommendations, and safety features.</li>
        <li>Deliver notifications you have opted into.</li>
        <li>
          Prevent fraud, abuse, cheating (drag racing anti-cheat), and violations of our Terms.
        </li>
        <li>Comply with legal obligations.</li>
      </ul>

      <h2>3. Sharing</h2>
      <p>We do not sell your personal information. We share data with:</p>
      <ul>
        <li>
          Service providers (hosting, analytics, push notifications, mapping, AI inference) under
          contract.
        </li>
        <li>
          Other users, based on your privacy settings (public posts, group ride members, etc.).
        </li>
        <li>Law enforcement, when required by valid legal process.</li>
      </ul>

      <h2>4. Your rights</h2>
      <p>
        You can access, correct, export, or delete your data from{" "}
        <span className="underline">Settings → Your data</span> and{" "}
        <span className="underline">Settings → Delete account</span>. EU/UK residents have rights
        under GDPR; California residents have rights under CCPA. Contact{" "}
        <a href="mailto:privacy@zombierex.com" className="underline">
          privacy@zombierex.com
        </a>
        .
      </p>

      <h2>5. Data retention</h2>
      <p>
        We retain account data while your account is active. When you delete your account, most data
        is deleted within 30 days; some logs are retained up to 90 days for abuse prevention. Ride
        GPS traces you mark private are deleted with your account.
      </p>

      <h2>6. Children</h2>
      <p>
        The Service is not directed to children under 13, and we do not knowingly collect data from
        them.
      </p>

      <h2>7. International transfers</h2>
      <p>
        Your data may be processed in countries other than your own. We use appropriate safeguards
        for international transfers.
      </p>

      <h2>8. Security</h2>
      <p>
        We use industry-standard measures (encryption in transit, RLS on our database, biometric app
        lock) to protect your data, but no system is perfectly secure.
      </p>

      <h2>9. Changes</h2>
      <p>We will notify you of material changes to this policy in-app.</p>

      <h2>10. Contact</h2>
      <p>
        <a href="mailto:privacy@zombierex.com" className="underline">
          privacy@zombierex.com
        </a>
      </p>
    </LegalShell>
  );
}
