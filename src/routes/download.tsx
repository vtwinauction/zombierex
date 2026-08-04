import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowLeft } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { StoreButtons, DownloadQr } from "@/components/marketing/StoreButtons";
import { siteConfig } from "@/config/site";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download ZOMBIEREX — iOS & Android App" },
      {
        name: "description",
        content:
          "Download the ZOMBIEREX app for iPhone and Android. Free automotive social network for riders, drivers, racers and clubs worldwide.",
      },
      { property: "og:title", content: "Download ZOMBIEREX — iOS & Android App" },
      {
        property: "og:description",
        content: "Get ZOMBIEREX free on iOS and Android. Scan the QR code and start your engine.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const d = siteConfig.downloads;
  return (
    <MarketingShell>
      <section className="mkt-section" style={{ borderTop: "none", paddingTop: 56 }}>
        <div className="mkt-wrap">
          <Link to="/" className="mkt-textlink" style={{ marginBottom: 24 }}>
            <ArrowLeft size={14} /> Back to home
          </Link>

          <div className="mkt-section-head" style={{ marginTop: 18 }}>
            <p className="mkt-eyebrow">Download</p>
            <h2>Get ZOMBIEREX.</h2>
            <p>
              Version {d.version} · {d.releaseDate}. Free on iPhone and Android.
            </p>
          </div>

          <div className="mkt-split">
            <div>
              <StoreButtons />
              <ul className="mkt-release" style={{ marginTop: 28 }}>
                {d.releaseNotes.map((r) => (
                  <li key={r}>
                    <Check size={14} /> {r}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 10 }}>
                {d.apk && (
                  <a className="mkt-btn" href={d.apk} target="_blank" rel="noreferrer noopener">
                    Direct APK
                  </a>
                )}
                {d.testflight && (
                  <a
                    className="mkt-btn"
                    href={d.testflight}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    TestFlight beta
                  </a>
                )}
                <Link to="/auth" className="mkt-btn mkt-btn-ghost">
                  Use the web app
                </Link>
              </div>
            </div>

            <div style={{ display: "grid", gap: 14, justifyItems: "start" }}>
              <DownloadQr />
              <p className="mkt-muted" style={{ fontSize: 12.5, maxWidth: 240, lineHeight: 1.6 }}>
                Scan with your phone camera to open the download page instantly.
              </p>
            </div>
          </div>

          <p className="mkt-muted" style={{ marginTop: 46, fontSize: 12.5 }}>
            By downloading you agree to our{" "}
            <Link to="/legal/terms" style={{ color: "var(--neon)" }}>
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/legal/privacy" style={{ color: "var(--neon)" }}>
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
