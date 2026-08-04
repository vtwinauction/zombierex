import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy · ZOMBIEREX" },
      {
        name: "description",
        content:
          "How ZOMBIEREX uses cookies, local storage and analytics identifiers, and how to control them.",
      },
      { property: "og:title", content: "Cookie Policy · ZOMBIEREX" },
      { property: "og:description", content: "Cookies, local storage and your choices." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy" updated="Effective: July 26, 2026">
      <p>
        This policy explains how ZOMBIEREX uses cookies and similar technologies (local storage,
        session storage and mobile device identifiers) on our website and in our applications.
      </p>

      <h2>Categories we use</h2>
      <ul>
        <li>
          <strong>Essential</strong> — authentication, security, fraud prevention, load balancing
          and remembering your consent choices. These cannot be disabled.
        </li>
        <li>
          <strong>Functional</strong> — language, region, theme and interface preferences.
        </li>
        <li>
          <strong>Analytics</strong> — aggregated usage statistics that help us improve performance
          and features. Optional.
        </li>
        <li>
          <strong>Marketing</strong> — measuring campaign effectiveness. Optional and off by
          default.
        </li>
      </ul>

      <h2>Managing your choices</h2>
      <p>
        You can accept, reject or adjust optional categories from the cookie banner on our website
        at any time by clearing site data and reloading. Browser settings also allow you to block or
        delete cookies, though blocking essential cookies will prevent sign-in from working.
      </p>

      <h2>Mobile applications</h2>
      <p>
        Our mobile apps do not use browser cookies. They store an authentication token and
        preferences on the device, and may use platform advertising identifiers only where you have
        granted permission.
      </p>

      <h2>Third parties</h2>
      <p>
        Service providers used for hosting, error reporting, push notifications, maps and payments
        may set their own identifiers when their features are used. Their handling of that data is
        governed by their own policies.
      </p>

      <h2>Contact</h2>
      <p>
        Questions:{" "}
        <a href="mailto:legal@zombierex.com" className="underline">
          legal@zombierex.com
        </a>
        .
      </p>
    </LegalShell>
  );
}
