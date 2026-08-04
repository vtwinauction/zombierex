import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/dmca")({
  head: () => ({
    meta: [
      { title: "Copyright & DMCA · ZOMBIEREX" },
      {
        name: "description",
        content: "How to submit a DMCA takedown notice or counter-notice for content on ZOMBIEREX.",
      },
      { property: "og:title", content: "Copyright & DMCA · ZOMBIEREX" },
      { property: "og:description", content: "DMCA takedown procedure." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DmcaPage,
});

function DmcaPage() {
  return (
    <LegalShell title="Copyright & DMCA" updated="Effective: July 26, 2026">
      <p>
        ZOMBIEREX respects intellectual property rights and expects users to do the same. If you
        believe content on the Service infringes your copyright, you may submit a notice under the
        Digital Millennium Copyright Act (17 U.S.C. § 512).
      </p>

      <h2>Submitting a notice</h2>
      <p>Send a written notice to our Designated Agent that includes:</p>
      <ol>
        <li>Your physical or electronic signature.</li>
        <li>Identification of the copyrighted work claimed to have been infringed.</li>
        <li>Identification of the material to be removed and a URL where it appears.</li>
        <li>Your contact information (address, phone, email).</li>
        <li>A statement that you have a good-faith belief the use is not authorized.</li>
        <li>
          A statement, under penalty of perjury, that the information is accurate and that you are
          the owner or authorized to act on the owner's behalf.
        </li>
      </ol>

      <h2>Designated Agent</h2>
      <address className="not-italic">
        ZOMBIEREX — Copyright Agent
        <br />
        <a href="mailto:dmca@zombierex.com" className="underline">
          dmca@zombierex.com
        </a>
      </address>

      <h2>Counter-notice</h2>
      <p>
        If you believe your content was removed in error, you may submit a counter-notice containing
        the elements required by 17 U.S.C. § 512(g)(3).
      </p>

      <h2>Repeat infringers</h2>
      <p>We terminate accounts of users who are repeat infringers.</p>
    </LegalShell>
  );
}
