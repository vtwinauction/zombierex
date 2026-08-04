import { createFileRoute } from "@tanstack/react-router";
import { SettingsScreen, Card } from "@/components/SettingsScreen";

export const Route = createFileRoute("/_authenticated/settings/terms")({
  head: () => ({
    meta: [
      { title: "Terms of service · ZOMBIEREX" },
      { name: "description", content: "The terms that govern your use of ZOMBIEREX." },
    ],
  }),
  component: TermsPage,
});

const SECTIONS: Array<[string, string]> = [
  [
    "1. Acceptance",
    "By creating an account you agree to these terms. If you don't agree, don't use ZOMBIEREX.",
  ],
  [
    "2. Your account",
    "Keep your credentials safe. You're responsible for activity under your account. Don't impersonate anyone.",
  ],
  [
    "3. Rider content",
    "You own your posts, reels, routes and telemetry. You grant ZOMBIEREX a licence to host and display them within the app.",
  ],
  [
    "4. Safety",
    "Ride within the law. Never race on public roads. Use verified drag mode on closed courses only.",
  ],
  [
    "5. Marketplace",
    "Sellers must accurately describe vehicles and parts. Buyers should inspect goods in person before payment.",
  ],
  [
    "6. Termination",
    "We may suspend accounts that violate these terms or harm the community. You can delete your account at any time.",
  ],
  [
    "7. Changes",
    "We'll notify you of material changes in-app. Continued use after changes means you accept the updated terms.",
  ],
];

function TermsPage() {
  return (
    <SettingsScreen
      index="06.14"
      section="TERMS"
      title="Terms of service"
      subtitle="Last updated July 2026."
    >
      <div className="space-y-2">
        {SECTIONS.map(([t, b]) => (
          <Card key={t}>
            <p className="serif text-[16px] italic" style={{ color: "var(--color-ink)" }}>
              {t}
            </p>
            <p
              className="mt-2 text-[13px] leading-relaxed"
              style={{ color: "var(--color-silver)" }}
            >
              {b}
            </p>
          </Card>
        ))}
      </div>
    </SettingsScreen>
  );
}
