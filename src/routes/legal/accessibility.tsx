import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility Statement · ZOMBIEREX" },
      {
        name: "description",
        content:
          "ZOMBIEREX accessibility commitments, supported assistive technologies and how to report barriers.",
      },
      { property: "og:title", content: "Accessibility Statement · ZOMBIEREX" },
      {
        property: "og:description",
        content: "Our accessibility commitments and feedback channel.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalShell title="Accessibility Statement" updated="Effective: July 26, 2026">
      <h2>Our commitment</h2>
      <p>
        We aim to meet WCAG 2.1 Level AA across the ZOMBIEREX website and applications, and we treat
        accessibility defects as functional bugs.
      </p>

      <h2>What we support</h2>
      <ul>
        <li>Screen readers (VoiceOver, TalkBack) with labelled controls and landmarks.</li>
        <li>Keyboard navigation with visible focus states on the web.</li>
        <li>Respect for reduced-motion and larger-text system settings.</li>
        <li>Colour contrast targets on primary text and interactive elements.</li>
        <li>Captions support on uploaded video where provided by the creator.</li>
      </ul>

      <h2>Known limitations</h2>
      <p>
        Some map, camera and live-timing interfaces are highly visual and may have reduced
        screen-reader support. We are actively improving these areas.
      </p>

      <h2>Feedback</h2>
      <p>
        If you encounter a barrier, email
        <a href="mailto:support@zombierex.com" className="underline">
          {" "}
          support@zombierex.com
        </a>{" "}
        with the screen and device details. We aim to respond within five business days.
      </p>
    </LegalShell>
  );
}
