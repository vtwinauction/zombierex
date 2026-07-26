import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance & Data Protection · ZOMBIEREX" },
      {
        name: "description",
        content:
          "How ZOMBIEREX complies with Bahrain PDPL, GCC data-protection frameworks, EU GDPR, UK GDPR, and California CCPA/CPRA.",
      },
      { property: "og:title", content: "Compliance & Data Protection · ZOMBIEREX" },
      { property: "og:description", content: "Global privacy, data-protection and platform-policy overview for riders and regulators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompliancePage,
});

type Section = { id: string; title: string; body: React.ReactNode };

const SECTIONS: Section[] = [
  {
    id: "overview",
    title: "01 · Overview",
    body: (
      <>
        <p>
          ZOMBIEREX is a social platform for motorcycle and automotive
          enthusiasts. This page describes how we handle personal data across
          jurisdictions and the platform policies that govern rider content,
          marketplace listings, and safety features.
        </p>
        <p className="mt-2">
          This is app-owner editable content maintained by ZOMBIEREX. It is a
          plain-language summary of controls we operate today; it is not a
          certification, legal opinion, or regulatory filing.
        </p>
      </>
    ),
  },
  {
    id: "bahrain-pdpl",
    title: "02 · Bahrain — Personal Data Protection Law (PDPL)",
    body: (
      <>
        <p>
          We align our handling of personal data with the Kingdom of Bahrain's
          <b> Personal Data Protection Law, Law No. (30) of 2018</b> and its
          implementing regulations issued by the Personal Data Protection
          Authority (PDPA).
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Lawful basis: consent, contract, or legitimate interest.</li>
          <li>Right to access, rectify, object, and erase your data.</li>
          <li>Notification of a data breach affecting Bahraini residents.</li>
          <li>
            Cross-border transfer safeguards where the destination country is
            not listed as adequate by the PDPA.
          </li>
          <li>
            Data-subject requests: <a className="underline" href="mailto:privacy@zombierex.com">privacy@zombierex.com</a>.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "gcc",
    title: "03 · GCC — Regional Data Protection",
    body: (
      <>
        <p>Where residents of other GCC states use ZOMBIEREX we also align with:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><b>UAE</b> — Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data (PDPL) and DIFC/ADGM data-protection regulations.</li>
          <li><b>Saudi Arabia</b> — Personal Data Protection Law (PDPL) issued by Royal Decree M/19 of 1443H, as amended, and SDAIA implementing regulations.</li>
          <li><b>Qatar</b> — Law No. 13 of 2016 on the Protection of Personal Data.</li>
          <li><b>Oman</b> — Personal Data Protection Law, Royal Decree No. 6/2022.</li>
          <li><b>Kuwait</b> — CITRA Data Privacy Protection Regulation.</li>
        </ul>
        <p className="mt-2">
          Where a stricter GCC requirement applies (for example, explicit
          consent for sensitive data or in-country hosting), we honour it for
          residents of that state.
        </p>
      </>
    ),
  },
  {
    id: "gdpr",
    title: "04 · EU & UK — GDPR",
    body: (
      <>
        <p>
          For users in the European Economic Area, United Kingdom, and
          Switzerland we process personal data under the <b>EU General Data
          Protection Regulation (2016/679)</b> and the <b>UK GDPR / Data
          Protection Act 2018</b>.
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Rights: access, rectification, erasure, restriction, portability, objection, and to withdraw consent.</li>
          <li>Legal bases documented per processing activity.</li>
          <li>Standard Contractual Clauses for transfers outside the EEA/UK.</li>
          <li>Data-protection incidents notified to the lead supervisory authority within 72 hours where required.</li>
        </ul>
      </>
    ),
  },
  {
    id: "ccpa",
    title: "05 · California — CCPA / CPRA",
    body: (
      <>
        <p>
          California residents have rights under the <b>California Consumer
          Privacy Act (as amended by the CPRA)</b>: to know, delete, correct,
          limit use of sensitive personal information, and to opt out of the
          sale or sharing of personal information. ZOMBIEREX does not sell
          personal information. Requests: <a className="underline" href="mailto:privacy@zombierex.com">privacy@zombierex.com</a>.
        </p>
      </>
    ),
  },
  {
    id: "worldwide",
    title: "06 · Worldwide baseline",
    body: (
      <>
        <p>Regardless of location we apply this baseline:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Encryption in transit (TLS) and at rest for stored personal data.</li>
          <li>Role-based access control with least-privilege database policies (Row-Level Security).</li>
          <li>Audit logging of privileged actions (role changes, moderation, payments, SOS).</li>
          <li>Retention limits and account deletion within 30 days of a verified request.</li>
          <li>Vulnerability reporting channel: <a className="underline" href="mailto:security@zombierex.com">security@zombierex.com</a>.</li>
        </ul>
      </>
    ),
  },
  {
    id: "safety",
    title: "07 · Safety, telemetry & SOS",
    body: (
      <>
        <p>
          Route recording, group-ride tracking, crash detection, and the SOS
          share-link only run while you enable them. Location data is bound to
          your account and is not sold. SOS share links use unguessable tokens
          and can be revoked at any time from the Atlas SOS screen.
        </p>
      </>
    ),
  },
  {
    id: "marketplace",
    title: "08 · Marketplace conduct",
    body: (
      <>
        <p>
          Sellers must describe vehicles and parts accurately and comply with
          local import, tax, and roadworthiness rules. ZOMBIEREX is not a party
          to the sale. Prohibited: stolen goods, counterfeit safety gear,
          weapons, and any items restricted by the buyer's or seller's
          jurisdiction.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "09 · Contact",
    body: (
      <>
        <p>Data-protection officer: <a className="underline" href="mailto:privacy@zombierex.com">privacy@zombierex.com</a></p>
        <p>Security disclosures: <a className="underline" href="mailto:security@zombierex.com">security@zombierex.com</a></p>
        <p>Trust & safety: <a className="underline" href="mailto:trust@zombierex.com">trust@zombierex.com</a></p>
        <p className="mt-2 text-[11px] opacity-60">Last reviewed: July 2026.</p>
      </>
    ),
  },
];

function CompliancePage() {
  return (
    <div style={{ background: "var(--color-cream, #fafaf7)", minHeight: "100vh", color: "var(--color-ink, #0a0a0a)" }}>
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-6">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ LEGAL · COMPLIANCE</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Compliance & Data Protection</h1>
        <p className="mt-2 text-sm opacity-70">
          Global overview covering Bahrain PDPL, GCC frameworks, EU/UK GDPR,
          California CCPA/CPRA, and our worldwide baseline.
        </p>

        <nav className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="mono-tag rounded-lg px-3 py-2 text-[11px]"
              style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)" }}
            >
              {s.title}
            </a>
          ))}
        </nav>

        <div className="mt-6 space-y-4">
          {SECTIONS.map((s) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-24 p-4"
              style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)", borderRadius: 12 }}
            >
              <h2 className="serif text-lg italic">{s.title}</h2>
              <div className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--color-silver)" }}>
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-[12px] opacity-60">
          Related: <Link to="/legal/compliance" className="underline">this page</Link>{" · "}
          <a href="mailto:privacy@zombierex.com" className="underline">privacy@zombierex.com</a>
        </p>
      </main>
    </div>
  );
}
