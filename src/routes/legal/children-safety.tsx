import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/children-safety")({
  head: () => ({ meta: [
    { title: "Children & Minors Safety · ZOMBIEREX" },
    { name: "description", content: "ZOMBIEREX age requirements, child safety standards and reporting channels for child endangerment." },
    { property: "og:title", content: "Children & Minors Safety · ZOMBIEREX" },
    { property: "og:description", content: "Age requirements and child safety standards." },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  return (
    <LegalShell title="Children & Minors Safety" updated="Effective: July 26, 2026">
      <h2>Minimum age</h2>
      <p>ZOMBIEREX is intended for users aged 16 and over, or 18 where local law, marketplace
        participation or monetisation features require it. We do not knowingly collect personal
        data from children below the applicable minimum age.</p>

      <h2>Zero tolerance</h2>
      <p>Child sexual abuse material (CSAM), grooming, sexualisation of minors and any content
        endangering a child are strictly prohibited. Accounts involved are terminated immediately,
        content is preserved for law enforcement, and reports are filed with the appropriate
        authorities and hotlines.</p>

      <h2>Reporting</h2>
      <p>Report suspected child endangerment immediately through the in-app report menu or to
        <a href="mailto:safety@zombierex.com" className="underline"> safety@zombierex.com</a>. Reports
        involving imminent risk are escalated within 24 hours.</p>

      <h2>Parents and guardians</h2>
      <p>If you believe a child under the minimum age holds an account, contact
        <a href="mailto:legal@zombierex.com" className="underline"> legal@zombierex.com</a> and we will
        verify and remove the account and associated data.</p>
    </LegalShell>
  );
}
