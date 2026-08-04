import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { siteConfig } from "@/config/site";

export const Route = createFileRoute("/legal/")({
  head: () => ({
    meta: [
      { title: "Legal Center — ZOMBIEREX Policies & Terms" },
      {
        name: "description",
        content:
          "All ZOMBIEREX policies in one place: terms of service, privacy, cookies, community guidelines, marketplace rules, safety disclaimers and copyright.",
      },
      { property: "og:title", content: "ZOMBIEREX Legal Center" },
      {
        property: "og:description",
        content: "Terms, privacy, cookies, community guidelines, marketplace and safety policies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LegalCenter,
});

const GROUPS = [
  {
    title: "Core agreements",
    items: [
      {
        to: "/legal/terms",
        label: "Terms of Service",
        desc: "The agreement between you and ZOMBIEREX.",
      },
      {
        to: "/legal/eula",
        label: "End User Licence Agreement",
        desc: "Licence terms for the mobile applications.",
      },
      {
        to: "/legal/acceptable-use",
        label: "Acceptable Use Policy",
        desc: "What is and is not allowed on the platform.",
      },
      {
        to: "/legal/community-guidelines",
        label: "Community Guidelines",
        desc: "How the community is expected to behave.",
      },
    ],
  },
  {
    title: "Privacy & data",
    items: [
      {
        to: "/legal/privacy",
        label: "Privacy Policy",
        desc: "What we collect, why, and your rights.",
      },
      {
        to: "/legal/cookies",
        label: "Cookie Policy",
        desc: "Cookies, storage and analytics identifiers.",
      },
      {
        to: "/legal/data-retention",
        label: "Data Retention & Deletion",
        desc: "How long we keep data and how to delete it.",
      },
      {
        to: "/legal/children-safety",
        label: "Children & Minors Safety",
        desc: "Age requirements and child safety standards.",
      },
    ],
  },
  {
    title: "Commerce",
    items: [
      {
        to: "/legal/marketplace-terms",
        label: "Marketplace Terms",
        desc: "Buying and selling vehicles, parts and gear.",
      },
      {
        to: "/legal/payments-refunds",
        label: "Payments, Fees & Refunds",
        desc: "Commission, settlements, refunds and chargebacks.",
      },
      {
        to: "/legal/creator-terms",
        label: "Creator & Monetisation Terms",
        desc: "Payouts, sponsorship and creator obligations.",
      },
      {
        to: "/legal/advertising",
        label: "Advertising Policy",
        desc: "Rules for promoted content and sponsorships.",
      },
    ],
  },
  {
    title: "Safety & compliance",
    items: [
      {
        to: "/legal/safety-disclaimer",
        label: "Riding, Racing & Safety Disclaimer",
        desc: "Motorsport risk, GPS timing and road-legal use.",
      },
      {
        to: "/legal/ai-disclaimer",
        label: "AI Features Disclaimer",
        desc: "AI judging, moderation and assistant limitations.",
      },
      {
        to: "/legal/dmca",
        label: "Copyright & DMCA",
        desc: "Takedown notices and counter-notices.",
      },
      {
        to: "/legal/accessibility",
        label: "Accessibility Statement",
        desc: "Our accessibility commitments.",
      },
      {
        to: "/legal/compliance",
        label: "Compliance Overview",
        desc: "Regulatory and platform compliance posture.",
      },
    ],
  },
] as const;

function LegalCenter() {
  return (
    <MarketingShell>
      <section className="mkt-section" style={{ borderTop: "none", paddingTop: 56 }}>
        <div className="mkt-wrap">
          <Link to="/" className="mkt-textlink" style={{ marginBottom: 24 }}>
            <ArrowLeft size={14} /> Back to home
          </Link>

          <div className="mkt-section-head" style={{ marginTop: 18 }}>
            <p className="mkt-eyebrow">Legal Center</p>
            <h2>Every policy, in plain sight.</h2>
            <p>
              These documents govern your use of ZOMBIEREX worldwide. Questions? Email{" "}
              <a href={`mailto:${siteConfig.contact.legal}`} style={{ color: "var(--neon)" }}>
                {siteConfig.contact.legal}
              </a>
              .
            </p>
          </div>

          {GROUPS.map((g) => (
            <div key={g.title} style={{ marginBottom: 40 }}>
              <h3
                style={{
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--txt-2)",
                  marginBottom: 14,
                }}
              >
                {g.title}
              </h3>
              <div className="mkt-grid">
                {g.items.map((it) => (
                  <Link key={it.to} to={it.to} className="mkt-card mkt-contact">
                    <FileText size={16} />
                    <h3>{it.label}</h3>
                    <p className="mkt-muted">{it.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <p className="mkt-muted" style={{ fontSize: 12.5 }}>
            Last reviewed: {new Date().getFullYear()}. We notify users in-app before material
            changes take effect.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
