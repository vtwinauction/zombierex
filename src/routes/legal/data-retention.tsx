import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/data-retention")({
  head: () => ({ meta: [
    { title: "Data Retention & Deletion · ZOMBIEREX" },
    { name: "description", content: "How long ZOMBIEREX keeps your data, how to export it, and how to permanently delete your account." },
    { property: "og:title", content: "Data Retention & Deletion · ZOMBIEREX" },
    { property: "og:description", content: "Retention periods, data export and account deletion." },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  return (
    <LegalShell title="Data Retention & Deletion" updated="Effective: July 26, 2026">
      <p>We keep personal data only as long as needed for the purposes described in the
        Privacy Policy, or as required by law.</p>

      <h2>Typical retention periods</h2>
      <ul>
        <li><strong>Account profile</strong> — while the account is active.</li>
        <li><strong>Posts, reels and stories</strong> — until you delete them or delete your account.</li>
        <li><strong>Messages</strong> — until deleted by a participant, or account deletion.</li>
        <li><strong>Transaction and tax records</strong> — up to 7 years, as required by financial regulation.</li>
        <li><strong>Moderation and safety records</strong> — up to 24 months to prevent repeat abuse.</li>
        <li><strong>Security and access logs</strong> — up to 12 months.</li>
        <li><strong>Backups</strong> — deleted data is purged from rolling backups within 35 days.</li>
      </ul>

      <h2>Exporting your data</h2>
      <p>In the app, open <em>Settings → Privacy → Export my data</em> to request a machine-readable
        copy of your profile, posts, messages and activity.</p>

      <h2>Deleting your account</h2>
      <p>Open <em>Settings → Account → Delete account</em>. Deletion removes your profile, content and
        personal data. Some records are retained where legally required (for example completed
        marketplace transactions) and are disassociated from your identity where possible.</p>

      <h2>Requests</h2>
      <p>You may also submit access, correction, portability or deletion requests to
        <a href="mailto:legal@zombierex.com" className="underline"> legal@zombierex.com</a>. We respond
        within 30 days.</p>
    </LegalShell>
  );
}
