import { createFileRoute } from "@tanstack/react-router";
import { SettingsScreen, Card } from "@/components/SettingsScreen";

export const Route = createFileRoute("/_authenticated/settings/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy · ZOMBIEREX" },
      { name: "description", content: "How ZOMBIEREX collects, uses and protects your data." },
    ],
  }),
  component: PrivacyPage,
});

const SECTIONS: Array<[string, string]> = [
  [
    "What we collect",
    "Profile details you provide, posts and media you upload, ride telemetry you record, and standard device/log data.",
  ],
  [
    "How we use it",
    "To operate the platform, personalise your feed, verify drag runs, power the AI Judge and keep the community safe.",
  ],
  [
    "Location & telemetry",
    "Route recording, group rides and crash detection only run while you have them enabled. You can stop and delete a ride at any time.",
  ],
  [
    "Sharing",
    "We never sell your data. We share only what's needed with service providers who host, process payments, or send notifications on our behalf.",
  ],
  [
    "Your controls",
    "You can edit your profile, download an export, mute words, block users and delete your account from Settings.",
  ],
  [
    "Retention",
    "We keep your data while your account is active. After deletion, we remove personal data within 30 days except where the law requires we retain it longer.",
  ],
  ["Contact", "Privacy questions: privacy@zombierex.com."],
];

function PrivacyPage() {
  return (
    <SettingsScreen
      index="06.15"
      section="PRIVACY"
      title="Privacy policy"
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
