import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { featureGuideBySlug, featureGuides, type FeatureGuide } from "@/config/feature-guides";

export const Route = createFileRoute("/features/$slug")({
  loader: ({ params }) => {
    const guide = featureGuideBySlug[params.slug];
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Feature not found — ZOMBIEREX" }, { name: "robots", content: "noindex" }] };
    }
    const { guide } = loaderData;
    const title = `${guide.title} — How it works | ZOMBIEREX`;
    return {
      meta: [
        { title },
        { name: "description", content: `${guide.tagline} ${guide.intro}`.slice(0, 155) },
        { property: "og:title", content: title },
        { property: "og:description", content: guide.tagline },
        { property: "og:type", content: "article" },
      ],
    };
  },
  component: FeatureGuidePage,
  notFoundComponent: FeatureNotFound,
});

function FeatureGuidePage() {
  const { guide } = Route.useLoaderData() as { guide: FeatureGuide };
  const idx = featureGuides.findIndex((g) => g.slug === guide.slug);
  const next = featureGuides[(idx + 1) % featureGuides.length];

  return (
    <MarketingShell>
      <section className="mkt-section" style={{ borderTop: "none", paddingTop: 56 }}>
        <div className="mkt-wrap">
          <Link to="/" hash="features" className="mkt-textlink" style={{ marginBottom: 24 }}>
            <ArrowLeft size={14} /> All features
          </Link>

          <div className="mkt-section-head" style={{ marginTop: 18 }}>
            <p className="mkt-eyebrow">How to use</p>
            <h1>{guide.title}</h1>
            <p>{guide.tagline}</p>
          </div>

          <div
            style={{
              marginTop: 26, borderRadius: 20, padding: 16,
              border: "1px solid var(--line, rgba(255,255,255,0.09))",
              background: "rgba(255,255,255,0.03)",
              display: "flex", justifyContent: "center",
            }}
          >
            <img
              src={guide.image}
              alt={guide.imageAlt}
              loading="lazy"
              style={{
                width: "100%", maxWidth: 300, height: "auto", maxHeight: 620,
                objectFit: "contain", borderRadius: 14,
                border: "1px solid var(--line, rgba(255,255,255,0.09))",
              }}
            />
          </div>


          <p className="mkt-muted" style={{ marginTop: 22, fontSize: 15, lineHeight: 1.7, maxWidth: 720 }}>
            {guide.intro}
          </p>

          <div style={{ display: "grid", gap: 12, marginTop: 30 }}>
            {guide.steps.map((s, i) => (
              <div
                key={s.title}
                style={{
                  display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 14,
                  padding: "16px 18px", borderRadius: 14,
                  background: "var(--surface, rgba(255,255,255,0.03))",
                  border: "1px solid var(--line, rgba(255,255,255,0.09))",
                }}
              >
                <span style={{ color: "var(--neon)", fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 13 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14.5, fontWeight: 600 }}>{s.title}</p>
                  <p className="mkt-muted" style={{ fontSize: 13.5, lineHeight: 1.65, marginTop: 4 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          {guide.tips.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <p className="mkt-eyebrow">Good to know</p>
              <ul className="mkt-muted" style={{ marginTop: 10, paddingInlineStart: 18, display: "grid", gap: 8, fontSize: 13.5, lineHeight: 1.6 }}>
                {guide.tips.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          )}

          <div style={{ marginTop: 38, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link to="/download" className="mkt-btn mkt-btn-neon">Get the app</Link>
            <Link to="/guide" className="mkt-btn mkt-btn-ghost">Full app guide</Link>
            <Link to="/features/$slug" params={{ slug: next.slug }} className="mkt-textlink">
              {next.title} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

function FeatureNotFound() {
  return (
    <MarketingShell>
      <section className="mkt-section" style={{ borderTop: "none", paddingTop: 72 }}>
        <div className="mkt-wrap">
          <h1>Feature not found</h1>
          <p className="mkt-muted" style={{ marginTop: 10 }}>That guide doesn't exist yet.</p>
          <Link to="/guide" className="mkt-btn mkt-btn-neon" style={{ marginTop: 22 }}>Open the app guide</Link>
        </div>
      </section>
    </MarketingShell>
  );
}
