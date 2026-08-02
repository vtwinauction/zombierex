import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const NAV: Array<{ to: string; label: string }> = [
  { to: "/legal/terms", label: "Terms" },
  { to: "/legal/privacy", label: "Privacy" },
  { to: "/legal/eula", label: "EULA" },
  { to: "/legal/community-guidelines", label: "Guidelines" },
  { to: "/legal/dmca", label: "DMCA" },
  { to: "/legal/compliance", label: "Compliance" },
];

export function LegalShell({ title, updated, children }: {
  title: string; updated: string; children: ReactNode;
}) {
  return (
    <div className="min-h-[100svh] pb-24" style={{ background: "var(--color-paper-1, #fafafa)" }}>
      <header className="mx-auto max-w-2xl px-5 pt-8">
        <Link to="/" className="mono-tag" style={{ color: "var(--color-neon, #00c853)" }}>← ZOMBIEREX</Link>
        <h1 className="serif mt-3 text-4xl leading-tight" style={{ color: "var(--color-ink, #f5f5f5)" }}>
          {title}
        </h1>
        <p className="mono-tag mt-2" style={{ color: "var(--color-silver, #9a9a9a)" }}>{updated}</p>

        <nav className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to as any}
              className="mono-tag underline underline-offset-4"
              style={{ color: "var(--color-titanium, #b8b8b8)" }}
              activeProps={{ style: { color: "var(--color-neon, #00c853)" } }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <article
        className="legal-prose mx-auto mt-8 max-w-2xl px-5 text-[14px] leading-relaxed"
        style={{ color: "var(--color-ash, #cfcfcf)" }}
      >
        {children}
      </article>

      <style>{`
        .legal-prose h2 { font-family: var(--font-serif, ui-serif, Georgia, serif); font-style: italic;
          color: var(--color-ink, #f5f5f5); font-size: 20px; margin: 28px 0 10px; }
        .legal-prose p { margin: 10px 0; }
        .legal-prose ul, .legal-prose ol { margin: 10px 0 10px 20px; }
        .legal-prose li { margin: 6px 0; }
        .legal-prose a { color: var(--color-neon, #00c853); }
        .legal-prose strong { color: var(--color-ink, #f5f5f5); }
      `}</style>
    </div>
  );
}
