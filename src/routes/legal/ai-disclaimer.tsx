import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/ai-disclaimer")({
  head: () => ({
    meta: [
      { title: "AI Features Disclaimer · ZOMBIEREX" },
      {
        name: "description",
        content:
          "How ZOMBIEREX uses AI for judging, moderation and assistance, and the limits of those systems.",
      },
      { property: "og:title", content: "AI Features Disclaimer · ZOMBIEREX" },
      { property: "og:description", content: "AI judging, moderation and assistant limitations." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalShell title="AI Features Disclaimer" updated="Effective: July 26, 2026">
      <h2>Where AI is used</h2>
      <ul>
        <li>
          <strong>AI judging</strong> — vision scoring of build and show competition entries.
        </li>
        <li>
          <strong>Moderation</strong> — automated screening of media, text and listings.
        </li>
        <li>
          <strong>Assistant</strong> — answers about the app, vehicles, routes and events.
        </li>
        <li>
          <strong>Ranking</strong> — personalising feed, reels and recommendations.
        </li>
      </ul>

      <h2>Limitations</h2>
      <p>
        AI outputs can be incomplete, biased or wrong. Scores, summaries, technical advice and
        recommendations are informational only and are not professional mechanical, medical,
        financial or legal advice. Always verify safety-critical information with a qualified
        professional.
      </p>

      <h2>Competition scoring</h2>
      <p>
        AI scores assist human organisers; they do not replace them. Organisers may override any AI
        result. Final placings are determined by the event organiser, whose decision is final.
      </p>

      <h2>Human review</h2>
      <p>
        Automated moderation decisions that restrict an account or remove content can be appealed
        for human review through the in-app report and appeal flows.
      </p>

      <h2>Data handling</h2>
      <p>
        Content submitted to AI features is processed by our model providers under contractual
        confidentiality and is not used to train third-party public models.
      </p>
    </LegalShell>
  );
}
