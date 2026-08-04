import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SettingsScreen, Card } from "@/components/SettingsScreen";

export const Route = createFileRoute("/_authenticated/settings/help")({
  head: () => ({
    meta: [
      { title: "Help centre · ZOMBIEREX" },
      { name: "description", content: "Guides and answers to common ZOMBIEREX questions." },
    ],
  }),
  component: HelpPage,
});

const FAQ = [
  {
    q: "How do I verify my rider status?",
    a: "Open your profile, tap Edit, and submit your rider ID + a photo of you with the bike. Verification usually completes within 48 hours.",
  },
  {
    q: "How does the AI Judge score my build?",
    a: "Upload photos, video and a cold-start audio clip. Gemini vision inspects paint, welds, fitment and defects, then returns a category-weighted score with a full report.",
  },
  {
    q: "How is a drag run verified?",
    a: "The run recorder samples GPS at 10Hz. We validate launch acceleration, top speed plausibility and continuity; only runs passing all checks earn the VERIFIED badge.",
  },
  {
    q: "Can I share a route with friends?",
    a: "In Atlas, open any recorded route → Share. Others can import it and use it for turn-by-turn navigation on their next trip.",
  },
  {
    q: "How do I contact support?",
    a: "Use Settings → Help & about → Report a problem. Include screenshots — it speeds things up.",
  },
];

function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <SettingsScreen
      index="06.11"
      section="HELP"
      title="Help centre"
      subtitle="Answers to the questions we hear most."
    >
      <div className="space-y-2">
        {FAQ.map((f, i) => (
          <Card key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="tap flex w-full items-start justify-between gap-3 text-left"
            >
              <span className="text-[14px]" style={{ color: "var(--color-ink)" }}>
                {f.q}
              </span>
              <span className="mono-tag" style={{ color: "var(--color-silver)" }}>
                {open === i ? "−" : "+"}
              </span>
            </button>
            {open === i && (
              <p
                className="mt-2 text-[13px] leading-relaxed"
                style={{ color: "var(--color-silver)" }}
              >
                {f.a}
              </p>
            )}
          </Card>
        ))}
        <Card>
          <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
            Still stuck?
          </p>
          <Link
            to="/settings/report"
            className="mono-tag mt-2 inline-block tap px-3 py-1.5 rounded-full"
            style={{ border: "1px solid var(--color-hair-strong)", color: "var(--color-ink)" }}
          >
            Report a problem →
          </Link>
        </Card>
      </div>
    </SettingsScreen>
  );
}
